from __future__ import annotations

from datetime import datetime

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from terrabyte.db import Base, TimestampMixin, UTCDateTime, utcnow
from terrabyte.models.enums import Language, UserRole, UserStatus, db_enum


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(db_enum(UserRole), index=True)
    status: Mapped[UserStatus] = mapped_column(db_enum(UserStatus), index=True)
    preferred_language: Mapped[Language] = mapped_column(db_enum(Language), default=Language.en)
    # Business name (vendors) or institution (experts); shown to admins during approval.
    organization: Mapped[str | None] = mapped_column(String(160))
    qualifications: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(String(80))
    district: Mapped[str | None] = mapped_column(String(80), index=True)
    village: Mapped[str | None] = mapped_column(String(120))
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    status_reason: Mapped[str | None] = mapped_column(String(500))
    status_changed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
