"""Server-side aggregates for the dashboards. Days and months are Indian Standard Time."""

from __future__ import annotations

import statistics
from collections import Counter, defaultdict
from collections.abc import Iterable
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from terrabyte.models import (
    Booking,
    BookingStatus,
    Consultation,
    Equipment,
    Order,
    OrderItem,
    OrderStatus,
    Product,
)
from terrabyte.schemas.analytics import DayPoint, EquipmentUse, ResponseTimes, TopProduct
from terrabyte.services.common import money
from terrabyte.timeutil import ist_date, ist_day_start, month_bounds, today_ist

DAYS = 30
LOW_STOCK = 5


def window_start(days: int = DAYS) -> tuple[date, datetime]:
    first = today_ist() - timedelta(days=days - 1)
    return first, ist_day_start(first)


def month_label() -> tuple[str, datetime, datetime]:
    first, nxt = month_bounds(today_ist())
    return first.strftime("%Y-%m"), ist_day_start(first), ist_day_start(nxt)


def count_by(db: Session, column, *where) -> dict[str, int]:
    rows = db.execute(select(column, func.count()).where(*where).group_by(column)).all()
    return {(k.value if hasattr(k, "value") else str(k)): n for k, n in rows}


def day_series(
    events: Iterable[tuple[datetime, Decimal | None]], days: int = DAYS
) -> list[DayPoint]:
    """Bucket (timestamp, value) pairs into the last ``days`` IST days, oldest first."""
    first, _ = window_start(days)
    counts: Counter[date] = Counter()
    values: dict[date, Decimal] = defaultdict(lambda: money(0))
    for moment, value in events:
        day = ist_date(moment)
        if day < first:
            continue
        counts[day] += 1
        if value is not None:
            values[day] += money(value)
    return [
        DayPoint(date=d, count=counts.get(d, 0), value=values.get(d, money(0)))
        for d in (first + timedelta(days=i) for i in range(days))
    ]


def sum_money(values: Iterable[Decimal | float | None]) -> Decimal:
    total = money(0)
    for v in values:
        if v is not None:
            total += money(v)
    return total


def response_times(rows: Iterable[tuple[datetime, datetime | None]]) -> ResponseTimes:
    hours = [
        (first - created).total_seconds() / 3600 for created, first in rows if first is not None
    ]
    if not hours:
        return ResponseTimes(responded=0, median_hours=None, average_hours=None)
    return ResponseTimes(
        responded=len(hours),
        median_hours=round(statistics.median(hours), 1),
        average_hours=round(statistics.fmean(hours), 1),
    )


def consultation_response_times(db: Session, *where) -> ResponseTimes:
    return response_times(
        db.execute(
            select(Consultation.created_at, Consultation.first_response_at).where(
                Consultation.first_response_at.is_not(None), *where
            )
        ).all()
    )


def top_products(db: Session, vendor_id: int, limit: int = 5) -> list[TopProduct]:
    rows = db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity),
            func.sum(OrderItem.line_total_inr),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.vendor_id == vendor_id, Order.status == OrderStatus.delivered)
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.line_total_inr).desc())
        .limit(limit)
    ).all()
    return [TopProduct(name=n, quantity=int(q), revenue=money(r or 0)) for n, q, r in rows]


def low_stock(db: Session, vendor_id: int) -> list[Product]:
    return list(
        db.scalars(
            select(Product)
            .where(
                Product.vendor_id == vendor_id,
                Product.active.is_(True),
                Product.stock <= LOW_STOCK,
            )
            .order_by(Product.stock, Product.name)
            .limit(10)
        )
    )


def utilisation(
    db: Session, owner_id: int, days: int = DAYS
) -> tuple[list[EquipmentUse], float | None]:
    """Share of the last ``days`` IST days on which each machine had an accepted or completed
    booking (a day counts if any booked hour falls on it)."""
    first, start = window_start(days)
    end = ist_day_start(today_ist() + timedelta(days=1))
    machines = list(
        db.scalars(
            select(Equipment)
            .where(Equipment.owner_id == owner_id, Equipment.active.is_(True))
            .order_by(Equipment.name)
        )
    )
    if not machines:
        return [], None
    bookings = db.execute(
        select(Booking.equipment_id, Booking.start_at, Booking.end_at).where(
            Booking.equipment_id.in_([m.id for m in machines]),
            Booking.status.in_((BookingStatus.accepted, BookingStatus.completed)),
            Booking.start_at < end,
            Booking.end_at > start,
        )
    ).all()
    booked: dict[int, set[date]] = defaultdict(set)
    last = today_ist()
    for eq_id, b_start, b_end in bookings:
        day = max(ist_date(b_start), first)
        stop = min(ist_date(b_end - timedelta(seconds=1)), last)
        while day <= stop:
            booked[eq_id].add(day)
            day += timedelta(days=1)
    uses = [
        EquipmentUse(
            equipment_id=m.id,
            name=m.name,
            booked_days=len(booked[m.id]),
            days=days,
            share=round(len(booked[m.id]) / days, 3),
        )
        for m in machines
    ]
    overall = round(sum(u.booked_days for u in uses) / (days * len(uses)), 3)
    return uses, overall


OPEN_ORDER = (OrderStatus.placed, OrderStatus.accepted, OrderStatus.shipped)
