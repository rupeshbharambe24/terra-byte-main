from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from terrabyte.db import Base, TimestampMixin, UTCDateTime, utcnow
from terrabyte.models.enums import BookingStatus, RentalUnit, db_enum

Money = Numeric(12, 2)


class Equipment(TimestampMixin, Base):
    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(60), index=True)
    rate_per_hour_inr: Mapped[Decimal | None] = mapped_column(Money)
    rate_per_day_inr: Mapped[Decimal | None] = mapped_column(Money)
    district: Mapped[str | None] = mapped_column(String(80), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)


class Booking(TimestampMixin, Base):
    """A rental request. ``amount_inr`` is computed server-side from the equipment rate."""

    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    equipment_id: Mapped[int] = mapped_column(ForeignKey("equipment.id"), index=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    start_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    end_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    unit: Mapped[RentalUnit] = mapped_column(db_enum(RentalUnit))
    amount_inr: Mapped[Decimal] = mapped_column(Money)
    status: Mapped[BookingStatus] = mapped_column(
        db_enum(BookingStatus), default=BookingStatus.requested, index=True
    )
    note: Mapped[str | None] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
