from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Date,
    Float,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from terrabyte.db import Base, TimestampMixin, UTCDateTime, utcnow
from terrabyte.models.enums import LedgerType, db_enum


class LedgerEntry(TimestampMixin, Base):
    """Farm accounts: income or expense, optionally linked to an order or booking."""

    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    field_id: Mapped[int | None] = mapped_column(
        ForeignKey("fields.id", ondelete="SET NULL"), index=True
    )
    entry_date: Mapped[date] = mapped_column(Date, index=True)
    type: Mapped[LedgerType] = mapped_column(db_enum(LedgerType))
    category: Mapped[str] = mapped_column(String(60))
    amount_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    note: Mapped[str | None] = mapped_column(String(500))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"))
    booking_id: Mapped[int | None] = mapped_column(ForeignKey("bookings.id", ondelete="SET NULL"))


class MandiPrice(Base):
    """Daily mandi (APMC) price in Rs/quintal, e.g. from the Agmarknet API on data.gov.in."""

    __tablename__ = "mandi_prices"
    __table_args__ = (
        UniqueConstraint(
            "market", "commodity", "variety", "grade", "arrival_date", name="uq_mandi_price_row"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    state: Mapped[str] = mapped_column(String(80), index=True)
    district: Mapped[str] = mapped_column(String(80), index=True)
    market: Mapped[str] = mapped_column(String(120), index=True)
    commodity: Mapped[str] = mapped_column(String(120), index=True)
    variety: Mapped[str] = mapped_column(String(120), default="")
    grade: Mapped[str] = mapped_column(String(60), default="")
    arrival_date: Mapped[date] = mapped_column(Date, index=True)
    min_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    max_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    modal_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    source: Mapped[str] = mapped_column(String(120))
    fetched_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class ModelEvaluation(Base):
    """A held-out evaluation result produced by one of our scripts (shown on the metrics page)."""

    __tablename__ = "model_evaluations"

    id: Mapped[int] = mapped_column(primary_key=True)
    model_name: Mapped[str] = mapped_column(String(120), index=True)
    version: Mapped[str] = mapped_column(String(60))
    dataset: Mapped[str] = mapped_column(String(200))
    metric_name: Mapped[str] = mapped_column(String(60))
    value: Mapped[float] = mapped_column(Float)
    evaluated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON)
