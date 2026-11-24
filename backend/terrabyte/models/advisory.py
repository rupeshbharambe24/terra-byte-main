from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from terrabyte.db import Base, TimestampMixin, UTCDateTime, utcnow
from terrabyte.models.enums import ConsultationStatus, db_enum


class KVK(TimestampMixin, Base):
    """Krishi Vigyan Kendra directory entry, curated from official sources."""

    __tablename__ = "kvks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    district: Mapped[str] = mapped_column(String(80), index=True)
    state: Mapped[str] = mapped_column(String(80), index=True)
    host_organisation: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text)
    pincode: Mapped[str | None] = mapped_column(String(6))
    phone: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(254))
    website: Mapped[str | None] = mapped_column(String(255))
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    source_url: Mapped[str | None] = mapped_column(String(500))
    verified_on: Mapped[date | None] = mapped_column(Date)


class Consultation(TimestampMixin, Base):
    __tablename__ = "consultations"

    id: Mapped[int] = mapped_column(primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expert_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    kvk_id: Mapped[int | None] = mapped_column(ForeignKey("kvks.id"), index=True)
    crop: Mapped[str | None] = mapped_column(String(80))
    category: Mapped[str | None] = mapped_column(String(60))
    question: Mapped[str] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[ConsultationStatus] = mapped_column(
        db_enum(ConsultationStatus), default=ConsultationStatus.open, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
    assigned_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    # First reply by an expert: used for the response-time analytics.
    first_response_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    closed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    messages: Mapped[list[ConsultationMessage]] = relationship(
        back_populates="consultation",
        cascade="all, delete-orphan",
        order_by="ConsultationMessage.created_at",
    )


class ConsultationMessage(TimestampMixin, Base):
    __tablename__ = "consultation_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    consultation_id: Mapped[int] = mapped_column(
        ForeignKey("consultations.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(String(255))

    consultation: Mapped[Consultation] = relationship(back_populates="messages")


class KnowledgeArticle(TimestampMixin, Base):
    """An article written by an expert; farmers can read it once it is published."""

    __tablename__ = "knowledge_articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    crop: Mapped[str | None] = mapped_column(String(80), index=True)
    body: Mapped[str] = mapped_column(Text)
    published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
