"""Equipment rentals: catalogue, owner equipment management, bookings and the calendar."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, status
from pydantic import AwareDatetime
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from terrabyte.db import utcnow
from terrabyte.errors import ApiError
from terrabyte.models import (
    Booking,
    BookingStatus,
    Equipment,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.pagination import Paging, page_rows
from terrabyte.schemas.common import Page
from terrabyte.schemas.rental import (
    BookingAction,
    BookingIn,
    BookingOut,
    BusySlot,
    EquipmentIn,
    EquipmentOut,
    EquipmentUpdate,
)
from terrabyte.security import CurrentUser, DbSession, SettingsDep, require_role
from terrabyte.services.bookings import (
    BLOCKING,
    change_booking_status,
    create_booking,
    get_booking_for,
)
from terrabyte.services.common import apply_patch, money
from terrabyte.services.uploads import check_owned_image

router = APIRouter(tags=["rentals"])

OwnerUser = Annotated[User, Depends(require_role(UserRole.hardware_vendor))]
FarmerUser = Annotated[User, Depends(require_role(UserRole.farmer))]
BookingViewer = Annotated[
    User, Depends(require_role(UserRole.farmer, UserRole.hardware_vendor, UserRole.admin))
]
MAX_WINDOW = timedelta(days=62)


def equipment_out(equipment: Equipment, owner: User) -> EquipmentOut:
    return EquipmentOut.model_validate(
        {
            **{c.key: getattr(equipment, c.key) for c in Equipment.__table__.columns},
            "owner_name": owner.name,
        }
    )


def bookings_out(db: Session, bookings: list[Booking], viewer: User) -> list[BookingOut]:
    eq_ids = {b.equipment_id for b in bookings}
    equipment = (
        {e.id: e for e in db.scalars(select(Equipment).where(Equipment.id.in_(eq_ids)))}
        if eq_ids
        else {}
    )
    user_ids = {b.farmer_id for b in bookings} | {e.owner_id for e in equipment.values()}
    users = (
        {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids)))} if user_ids else {}
    )
    out = []
    for b in bookings:
        eq = equipment[b.equipment_id]
        farmer, owner = users.get(b.farmer_id), users.get(eq.owner_id)
        show_phone = viewer.id == eq.owner_id or viewer.role == UserRole.admin
        out.append(
            BookingOut.model_validate(
                {
                    **{c.key: getattr(b, c.key) for c in Booking.__table__.columns},
                    "equipment_name": eq.name,
                    "equipment_type": eq.type,
                    "owner_id": eq.owner_id,
                    "owner_name": owner.name if owner else "",
                    "farmer_name": farmer.name if farmer else "",
                    "farmer_phone": farmer.phone if (farmer and show_phone) else None,
                }
            )
        )
    return out


def _visible_equipment(db: Session, equipment_id: int, user: User) -> tuple[Equipment, User]:
    row = db.execute(
        select(Equipment, User)
        .join(User, User.id == Equipment.owner_id)
        .where(Equipment.id == equipment_id)
    ).first()
    if row is None:
        raise ApiError(404, "not_found", "Equipment not found.")
    equipment, owner = row
    visible = equipment.active and owner.status == UserStatus.approved
    if not visible and user.id != owner.id and user.role != UserRole.admin:
        raise ApiError(404, "not_found", "Equipment not found.")
    return equipment, owner


# ---- Catalogue ---------------------------------------------------------------------------


@router.get("/equipment", response_model=Page[EquipmentOut])
def list_equipment(
    _user: CurrentUser,
    db: DbSession,
    paging: Paging,
    q: Annotated[str | None, Query(max_length=100)] = None,
    type: Annotated[str | None, Query(max_length=60)] = None,  # noqa: A002
    district: Annotated[str | None, Query(max_length=80)] = None,
) -> Page[EquipmentOut]:
    stmt = (
        select(Equipment, User)
        .join(User, User.id == Equipment.owner_id)
        .where(
            Equipment.active.is_(True),
            User.status == UserStatus.approved,
            User.role == UserRole.hardware_vendor,
        )
    )
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(func.lower(Equipment.name).like(like), func.lower(User.name).like(like))
        )
    if type:
        stmt = stmt.where(Equipment.type == type)
    if district and district.strip():
        stmt = stmt.where(func.lower(Equipment.district) == district.strip().lower())
    rows, total = page_rows(db, stmt.order_by(Equipment.name, Equipment.id), paging)
    return Page(
        items=[equipment_out(e, o) for e, o in rows],
        total=total,
        limit=paging.limit,
        offset=paging.offset,
    )


@router.get("/equipment/{equipment_id}", response_model=EquipmentOut)
def get_equipment(equipment_id: int, user: CurrentUser, db: DbSession) -> EquipmentOut:
    return equipment_out(*_visible_equipment(db, equipment_id, user))


@router.get("/equipment/{equipment_id}/busy", response_model=list[BusySlot])
def equipment_busy(
    equipment_id: int,
    user: CurrentUser,
    db: DbSession,
    date_from: Annotated[AwareDatetime, Query(alias="from")],
    date_to: Annotated[AwareDatetime, Query(alias="to")],
) -> list[BusySlot]:
    """Periods already requested or booked (no farmer details), for choosing a free slot."""
    _visible_equipment(db, equipment_id, user)
    _check_window(date_from, date_to)
    rows = db.scalars(
        select(Booking)
        .where(
            Booking.equipment_id == equipment_id,
            Booking.status.in_(BLOCKING),
            Booking.start_at < date_to,
            Booking.end_at > date_from,
        )
        .order_by(Booking.start_at)
    )
    return [BusySlot(start_at=b.start_at, end_at=b.end_at, status=b.status) for b in rows]


def _check_window(date_from: datetime, date_to: datetime) -> None:
    if date_to <= date_from or date_to - date_from > MAX_WINDOW:
        raise ApiError(422, "invalid_period", "Choose a period of at most 62 days.")


# ---- Owner equipment management ---------------------------------------------------------------


@router.get("/hardware/equipment", response_model=Page[EquipmentOut])
def owner_equipment(
    owner: OwnerUser, db: DbSession, paging: Paging, active: bool | None = None
) -> Page[EquipmentOut]:
    stmt = select(Equipment).where(Equipment.owner_id == owner.id)
    if active is not None:
        stmt = stmt.where(Equipment.active.is_(active))
    rows, total = page_rows(db, stmt.order_by(Equipment.active.desc(), Equipment.name), paging)
    return Page(
        items=[equipment_out(e, owner) for e in rows],
        total=total,
        limit=paging.limit,
        offset=paging.offset,
    )


@router.post(
    "/hardware/equipment", response_model=EquipmentOut, status_code=status.HTTP_201_CREATED
)
def create_equipment(
    data: EquipmentIn, owner: OwnerUser, db: DbSession, settings: SettingsDep
) -> EquipmentOut:
    check_owned_image(data.image_path, owner.id, settings.upload_dir)
    values = data.model_dump()
    for key in ("rate_per_hour_inr", "rate_per_day_inr"):
        if values[key] is not None:
            values[key] = money(values[key])
    if not values.get("district"):
        values["district"] = owner.district
    equipment = Equipment(owner_id=owner.id, **values)
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    return equipment_out(equipment, owner)


@router.patch("/hardware/equipment/{equipment_id}", response_model=EquipmentOut)
def update_equipment(
    equipment_id: int,
    data: EquipmentUpdate,
    owner: OwnerUser,
    db: DbSession,
    settings: SettingsDep,
) -> EquipmentOut:
    equipment = db.get(Equipment, equipment_id)
    if equipment is None or equipment.owner_id != owner.id:
        raise ApiError(404, "not_found", "Equipment not found.")
    changes = data.model_dump(exclude_unset=True)
    if changes.get("image_path"):
        check_owned_image(changes["image_path"], owner.id, settings.upload_dir)
    for key in ("rate_per_hour_inr", "rate_per_day_inr"):
        if changes.get(key) is not None:
            changes[key] = money(changes[key])
    apply_patch(equipment, changes, {"name", "type", "active"})
    if equipment.rate_per_hour_inr is None and equipment.rate_per_day_inr is None:
        db.rollback()
        raise ApiError(422, "validation_error", "Give an hourly rate, a daily rate or both.")
    db.commit()
    db.refresh(equipment)
    return equipment_out(equipment, owner)


# ---- Bookings ----------------------------------------------------------------------------------


@router.post("/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def book(data: BookingIn, farmer: FarmerUser, db: DbSession) -> BookingOut:
    return bookings_out(db, [create_booking(db, farmer, data)], farmer)[0]


@router.get("/bookings", response_model=Page[BookingOut])
def list_bookings(
    user: BookingViewer,
    db: DbSession,
    paging: Paging,
    status_: Annotated[list[BookingStatus] | None, Query(alias="status")] = None,
    equipment_id: int | None = None,
    date_from: Annotated[AwareDatetime | None, Query(alias="from")] = None,
    date_to: Annotated[AwareDatetime | None, Query(alias="to")] = None,
    upcoming: bool = False,
) -> Page[BookingOut]:
    """Farmers see their bookings, owners the bookings of their equipment, admins all.

    ``from``/``to`` return bookings overlapping that window (used by the calendar)."""
    stmt = select(Booking).join(Equipment, Equipment.id == Booking.equipment_id)
    if user.role == UserRole.farmer:
        stmt = stmt.where(Booking.farmer_id == user.id)
    elif user.role == UserRole.hardware_vendor:
        stmt = stmt.where(Equipment.owner_id == user.id)
    if status_:
        stmt = stmt.where(Booking.status.in_(status_))
    if equipment_id is not None:
        stmt = stmt.where(Booking.equipment_id == equipment_id)
    if date_from is not None and date_to is not None:
        _check_window(date_from, date_to)
        stmt = stmt.where(Booking.start_at < date_to, Booking.end_at > date_from)
    elif date_from is not None or date_to is not None:
        raise ApiError(422, "invalid_period", "Give both from and to.")
    if upcoming:
        stmt = stmt.where(Booking.end_at > utcnow()).order_by(Booking.start_at, Booking.id)
    else:
        stmt = stmt.order_by(Booking.start_at.desc(), Booking.id.desc())
    rows, total = page_rows(db, stmt, paging)
    return Page(
        items=bookings_out(db, rows, user), total=total, limit=paging.limit, offset=paging.offset
    )


@router.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, user: BookingViewer, db: DbSession) -> BookingOut:
    booking, _eq = get_booking_for(db, user, booking_id)
    return bookings_out(db, [booking], user)[0]


@router.post("/bookings/{booking_id}/{action}", response_model=BookingOut)
def booking_action(
    booking_id: int,
    action: str,
    user: BookingViewer,
    db: DbSession,
    data: Annotated[BookingAction | None, Body()] = None,
) -> BookingOut:
    """``accept``/``reject``/``complete`` (owner) or ``cancel`` (farmer, before the start)."""
    booking = change_booking_status(db, user, booking_id, action, data.reason if data else None)
    return bookings_out(db, [booking], user)[0]
