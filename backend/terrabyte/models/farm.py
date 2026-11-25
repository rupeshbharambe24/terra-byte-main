from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from terrabyte.db import Base, TimestampMixin


class Field(TimestampMixin, Base):
    """A farmer's plot. Location is used for weather and irrigation (Phase 3)."""

    __tablename__ = "fields"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    area_acres: Mapped[float] = mapped_column(Float)
    soil_type: Mapped[str | None] = mapped_column(String(60))
    irrigation_source: Mapped[str | None] = mapped_column(String(60))
    # Crop key (see terrabyte.agro.crops) or free text from older entries.
    current_crop: Mapped[str | None] = mapped_column(String(80))
    # Crop-calendar season key (e.g. "kharif", "rabi", "suru"); picks FAO-56 stage rows.
    season: Mapped[str | None] = mapped_column(String(40))
    sowing_date: Mapped[date | None] = mapped_column(Date)
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)

    soil_tests: Mapped[list[SoilTest]] = relationship(
        back_populates="field", cascade="all, delete-orphan"
    )


class SoilTest(TimestampMixin, Base):
    """Soil Health Card style lab result. Macro-nutrients in kg/ha, micro-nutrients in ppm.

    P and K are stored as printed on the card; ``p_basis`` / ``k_basis`` say whether the card
    reports elemental P/K or the oxides P2O5/K2O (converted when rating).
    """

    __tablename__ = "soil_tests"

    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id", ondelete="CASCADE"), index=True)
    test_date: Mapped[date] = mapped_column(Date)
    lab: Mapped[str | None] = mapped_column(String(160))
    ph: Mapped[float | None] = mapped_column(Float)
    ec_ds_m: Mapped[float | None] = mapped_column(Float)
    oc_pct: Mapped[float | None] = mapped_column(Float)
    n_kg_ha: Mapped[float | None] = mapped_column(Float)
    p_kg_ha: Mapped[float | None] = mapped_column(Float)
    k_kg_ha: Mapped[float | None] = mapped_column(Float)
    p_basis: Mapped[str] = mapped_column(String(5), default="P")
    k_basis: Mapped[str] = mapped_column(String(5), default="K")
    s_ppm: Mapped[float | None] = mapped_column(Float)
    zn_ppm: Mapped[float | None] = mapped_column(Float)
    fe_ppm: Mapped[float | None] = mapped_column(Float)
    mn_ppm: Mapped[float | None] = mapped_column(Float)
    cu_ppm: Mapped[float | None] = mapped_column(Float)
    b_ppm: Mapped[float | None] = mapped_column(Float)

    field: Mapped[Field] = relationship(back_populates="soil_tests")
