"""Equipment bookings: server-side amount, overlap check under a row lock, status machine."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from terrabyte.db import utcnow
from terrabyte.errors import ApiError
from terrabyte.models import (
    Booking,
    BookingStatus,
    Equipment,
    RentalUnit,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.schemas.rental import BookingIn
from terrabyte.services.common import money
from terrabyte.services.ledger import record_booking_expense
from terrabyte.services.notifications import notify

B = BookingStatus
BLOCKING = (B.requested, B.accepted)  # statuses that occupy the equipment
UNIT_SECONDS = {RentalUnit.hour: 3600, RentalUnit.day: 86400}
MAX_UNITS = {RentalUnit.hour: 72, RentalUnit.day: 60}
MAX_ADVANCE = timedelta(days=365)
START_GRACE = timedelta(minutes=5)


def booking_units(unit: RentalUnit, start_at: datetime, end_at: datetime) -> int:
    """Whole number of hours/days between start and end, or ApiError 422."""
    seconds = (end_at - start_at).total_seconds()
    if seconds <= 0:
        raise ApiError(422, "invalid_period", "The end must be after the start.")
    units, rest = divmod(int(seconds), UNIT_SECONDS[unit])
    if rest or seconds != int(seconds):
        raise ApiError(
            422, "invalid_period", f"Book whole {unit.value}s (the period must divide evenly)."
        )
    if units > MAX_UNITS[unit]:
        raise ApiError(
            422, "invalid_period", f"At most {MAX_UNITS[unit]} {unit.value}s per booking."
        )
    return units


def overlapping(db: Session, equipment_id: int, start_at: datetime, end_at: datetime):
    """Bookings that occupy any part of [start_at, end_at) (touching ends do not overlap)."""
    return select(Booking).where(
        Booking.equipment_id == equipment_id,
        Booking.status.in_(BLOCKING),
        Booking.start_at < end_at,
        Booking.end_at > start_at,
    )


def create_booking(db: Session, farmer: User, data: BookingIn) -> Booking:
    row = db.execute(
        select(Equipment, User)
        .join(User, User.id == Equipment.owner_id)
        .where(Equipment.id == data.equipment_id)
    ).first()
    if row is None:
        raise ApiError(404, "not_found", "Equipment not found.")
    equipment, owner = row
    if not equipment.active or owner.status != UserStatus.approved:
        raise ApiError(409, "equipment_unavailable", "This equipment is not available.")

    rate = (
        equipment.rate_per_hour_inr if data.unit == RentalUnit.hour else equipment.rate_per_day_inr
    )
    if rate is None:
        raise ApiError(
            422, "unit_not_offered", f"This equipment is not rented per {data.unit.value}."
        )
    now = utcnow()
    if data.start_at < now - START_GRACE:
        raise ApiError(422, "start_in_past", "The start time is in the past.")
    if data.start_at > now + MAX_ADVANCE:
        raise ApiError(422, "invalid_period", "Bookings can be made up to one year ahead.")
    units = booking_units(data.unit, data.start_at, data.end_at)

    # Take the write lock on the equipment row first (row lock on Postgres, database write lock
    # on SQLite). Concurrent bookings for the same equipment queue here, so the overlap check
    # below always sees every committed booking and two clashing requests cannot both pass.
    db.execute(
        update(Equipment)
        .where(Equipment.id == equipment.id)
        .values(updated_at=now)
        .execution_options(synchronize_session=False)
    )
    clash = db.scalars(overlapping(db, equipment.id, data.start_at, data.end_at).limit(1)).first()
    if clash is not None:
        db.rollback()
        raise ApiError(
            409, "booking_clash", "The equipment is already booked for part of this period."
        )

    rate = money(rate)
    booking = Booking(
        equipment_id=equipment.id,
        farmer_id=farmer.id,
        start_at=data.start_at,
        end_at=data.end_at,
        unit=data.unit,
        units=units,
        rate_inr=rate,
        amount_inr=money(rate * units),
        status=B.requested,
        note=data.note,
    )
    db.add(booking)
    db.flush()
    notify(
        db,
        equipment.owner_id,
        "booking_requested",
        f"Booking request #{booking.id}: {equipment.name}",
        f"{farmer.name} asked for {units} {data.unit.value}(s), Rs {booking.amount_inr}.",
        "/hardware-rentals",
    )
    db.commit()
    db.refresh(booking)
    return booking


@dataclass(frozen=True)
class Transition:
    sources: frozenset[BookingStatus]
    target: BookingStatus
    actor: str  # "owner" or "farmer"
    stamp: str


TRANSITIONS: dict[str, Transition] = {
    "accept": Transition(frozenset({B.requested}), B.accepted, "owner", "accepted_at"),
    "reject": Transition(frozenset({B.requested}), B.rejected, "owner", "rejected_at"),
    "complete": Transition(frozenset({B.accepted}), B.completed, "owner", "completed_at"),
    "cancel": Transition(
        frozenset({B.requested, B.accepted}), B.cancelled, "farmer", "cancelled_at"
    ),
}

_NOTICES = {
    "accept": (
        "booking_accepted",
        "Booking #{id} accepted",
        "Your equipment booking is confirmed.",
    ),
    "reject": ("booking_rejected", "Booking #{id} rejected", "The owner could not take it."),
    "complete": ("booking_completed", "Booking #{id} completed", "Added to your farm accounts."),
    "cancel": ("booking_cancelled", "Booking #{id} cancelled", "The farmer cancelled the booking."),
}


def get_booking_for(db: Session, user: User, booking_id: int) -> tuple[Booking, Equipment]:
    row = db.execute(
        select(Booking, Equipment)
        .join(Equipment, Equipment.id == Booking.equipment_id)
        .where(Booking.id == booking_id)
    ).first()
    if row is None:
        raise ApiError(404, "not_found", "Booking not found.")
    booking, equipment = row
    if user.role != UserRole.admin and user.id not in (booking.farmer_id, equipment.owner_id):
        raise ApiError(404, "not_found", "Booking not found.")
    return booking, equipment


def change_booking_status(
    db: Session, user: User, booking_id: int, action: str, reason: str | None
) -> Booking:
    if action not in TRANSITIONS:
        raise ApiError(404, "not_found", "Unknown action.")
    rule = TRANSITIONS[action]
    booking, equipment = get_booking_for(db, user, booking_id)
    actor_id = equipment.owner_id if rule.actor == "owner" else booking.farmer_id
    if user.id != actor_id:
        raise ApiError(403, "forbidden", "You cannot do this on this booking.")
    now = utcnow()
    if action == "cancel" and now >= booking.start_at:
        raise ApiError(409, "booking_started", "A booking can only be cancelled before it starts.")
    if action == "accept" and now >= booking.end_at:
        raise ApiError(409, "booking_expired", "This booking period is already over.")
    if action == "complete" and now < booking.start_at:
        raise ApiError(409, "booking_not_started", "A booking can be completed once it starts.")

    values: dict[str, object] = {"status": rule.target, "updated_at": now, rule.stamp: now}
    if action in ("reject", "cancel"):
        values["status_reason"] = reason
    result = db.execute(
        update(Booking)
        .where(Booking.id == booking.id, Booking.status.in_(rule.sources))
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        db.rollback()
        db.refresh(booking)
        raise ApiError(
            409,
            "invalid_transition",
            f"Cannot {action} a booking whose status is {booking.status.value}.",
        )
    db.flush()
    db.refresh(booking)
    if rule.target == B.completed:
        record_booking_expense(db, booking)
    type_, title, body = _NOTICES[action]
    if reason and action in ("reject", "cancel"):
        body = f"{body} Reason: {reason}"
    if rule.actor == "owner":
        notify(
            db,
            booking.farmer_id,
            type_,
            title.format(id=booking.id),
            f"{equipment.name}. {body}",
            "/equipment-rentals?tab=bookings",
        )
    else:
        notify(
            db,
            equipment.owner_id,
            type_,
            title.format(id=booking.id),
            f"{equipment.name}. {body}",
            "/hardware-rentals",
        )
    db.commit()
    db.refresh(booking)
    return booking
