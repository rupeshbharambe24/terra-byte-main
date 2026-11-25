from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from terrabyte.db import Base, TimestampMixin


class DiseaseCheck(TimestampMixin, Base):
    """One leaf photo checked by the disease model for a farmer (their history)."""

    __tablename__ = "disease_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    crop: Mapped[str] = mapped_column(String(40))
    image_path: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20))  # confident | uncertain | rejected
    reason: Mapped[str | None] = mapped_column(String(40))  # why rejected / why uncertain
    top_class: Mapped[str | None] = mapped_column(String(80))
    top_probability: Mapped[float | None] = mapped_column(Float)
    top3: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    model_version: Mapped[str] = mapped_column(String(60))
    consultation_id: Mapped[int | None] = mapped_column(
        ForeignKey("consultations.id", ondelete="SET NULL")
    )
