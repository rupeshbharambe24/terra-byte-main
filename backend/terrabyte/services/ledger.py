"""Farm accounts: automatic entries from deliveries/rentals, summaries and CSV export."""

from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from terrabyte.models import (
    Booking,
    Equipment,
    Field,
    LedgerEntry,
    LedgerType,
    Order,
    User,
)
from terrabyte.schemas.farm import (
    CategoryTotal,
    FieldTotal,
    LedgerSummary,
    MonthTotal,
)
from terrabyte.services.common import money
from terrabyte.timeutil import ist_date, today_ist


def record_order_expense(db: Session, order: Order) -> LedgerEntry | None:
    """Add the delivered order to the buyer's accounts once (caller commits)."""
    if db.scalar(select(LedgerEntry.id).where(LedgerEntry.order_id == order.id)) is not None:
        return None
    vendor = db.get(User, order.vendor_id)
    entry = LedgerEntry(
        user_id=order.buyer_id,
        entry_date=ist_date(order.delivered_at) if order.delivered_at else today_ist(),
        type=LedgerType.expense,
        category="farm_inputs",
        amount_inr=money(order.total_inr),
        note=f"Marketplace order #{order.id}" + (f" from {vendor.name}" if vendor else ""),
        order_id=order.id,
    )
    db.add(entry)
    return entry


def record_booking_expense(db: Session, booking: Booking) -> LedgerEntry | None:
    """Add the completed rental to the farmer's accounts once (caller commits)."""
    if db.scalar(select(LedgerEntry.id).where(LedgerEntry.booking_id == booking.id)) is not None:
        return None
    equipment = db.get(Equipment, booking.equipment_id)
    entry = LedgerEntry(
        user_id=booking.farmer_id,
        entry_date=ist_date(booking.start_at),
        type=LedgerType.expense,
        category="equipment_rental",
        amount_inr=money(booking.amount_inr),
        note=f"Equipment booking #{booking.id}" + (f": {equipment.name}" if equipment else ""),
        booking_id=booking.id,
    )
    db.add(entry)
    return entry


def ledger_query(
    user_id: int,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    type_: LedgerType | None = None,
    category: str | None = None,
    field_id: int | None = None,
) -> Select:
    stmt = (
        select(LedgerEntry, Field.name)
        .outerjoin(Field, Field.id == LedgerEntry.field_id)
        .where(LedgerEntry.user_id == user_id)
    )
    if date_from is not None:
        stmt = stmt.where(LedgerEntry.entry_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(LedgerEntry.entry_date <= date_to)
    if type_ is not None:
        stmt = stmt.where(LedgerEntry.type == type_)
    if category:
        stmt = stmt.where(LedgerEntry.category == category)
    if field_id is not None:
        stmt = stmt.where(LedgerEntry.field_id == field_id)
    return stmt.order_by(LedgerEntry.entry_date.desc(), LedgerEntry.id.desc())


def summarize(
    db: Session, user_id: int, date_from: date | None, date_to: date | None
) -> LedgerSummary:
    rows = db.execute(ledger_query(user_id, date_from=date_from, date_to=date_to)).all()
    zero = money(0)
    income = expense = zero
    months: dict[str, dict[str, Decimal]] = defaultdict(lambda: {"income": zero, "expense": zero})
    categories: dict[tuple[LedgerType, str], Decimal] = defaultdict(lambda: zero)
    fields: dict[int | None, dict[str, object]] = {}
    for entry, field_name in rows:
        amount = money(entry.amount_inr)
        kind = entry.type.value
        if entry.type == LedgerType.income:
            income += amount
        else:
            expense += amount
        months[entry.entry_date.strftime("%Y-%m")][kind] += amount
        categories[(entry.type, entry.category)] += amount
        bucket = fields.setdefault(
            entry.field_id,
            {"field_name": field_name, "income": zero, "expense": zero},
        )
        bucket[kind] = bucket[kind] + amount  # type: ignore[operator]
    return LedgerSummary(
        date_from=date_from,
        date_to=date_to,
        income=income,
        expense=expense,
        net=income - expense,
        entries=len(rows),
        by_month=[
            MonthTotal(month=m, income=v["income"], expense=v["expense"])
            for m, v in sorted(months.items())
        ],
        by_category=[
            CategoryTotal(type=t, category=c, amount=a)
            for (t, c), a in sorted(categories.items(), key=lambda kv: (-kv[1], kv[0][1]))
        ],
        by_field=[
            FieldTotal(field_id=fid, **v)  # type: ignore[arg-type]
            for fid, v in sorted(fields.items(), key=lambda kv: (kv[0] is None, kv[0] or 0))
        ],
    )


def export_csv(db: Session, user_id: int, date_from: date | None, date_to: date | None) -> str:
    rows = db.execute(ledger_query(user_id, date_from=date_from, date_to=date_to)).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["date", "type", "category", "amount_inr", "field", "note", "order_id", "booking_id"]
    )
    for entry, field_name in reversed(rows):  # oldest first in a spreadsheet
        writer.writerow(
            [
                entry.entry_date.isoformat(),
                entry.type.value,
                entry.category,
                f"{money(entry.amount_inr):.2f}",
                field_name or "",
                _safe_cell(entry.note or ""),
                entry.order_id or "",
                entry.booking_id or "",
            ]
        )
    return buf.getvalue()


def _safe_cell(text: str) -> str:
    """Neutralise spreadsheet formula injection (cells starting with = + - @)."""
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text
