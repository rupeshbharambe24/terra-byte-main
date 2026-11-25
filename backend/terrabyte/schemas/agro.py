"""Inputs (validated server-side) for the agronomy endpoints."""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from terrabyte.schemas.common import BlankToNone

Kg = Annotated[float | None, Field(ge=0, le=5000)]
Ppm = Annotated[float | None, Field(ge=0, le=1000)]


class SoilTestIn(BaseModel):
    test_date: date
    lab: Annotated[str | None, Field(max_length=160), BlankToNone] = None
    ph: Annotated[float | None, Field(ge=0, le=14)] = None
    ec_ds_m: Annotated[float | None, Field(ge=0, le=100)] = None
    oc_pct: Annotated[float | None, Field(ge=0, le=20)] = None
    n_kg_ha: Kg = None
    p_kg_ha: Kg = None
    p_basis: Literal["P", "P2O5"] = "P"
    k_kg_ha: Kg = None
    k_basis: Literal["K", "K2O"] = "K"
    s_ppm: Ppm = None
    zn_ppm: Ppm = None
    fe_ppm: Ppm = None
    mn_ppm: Ppm = None
    cu_ppm: Ppm = None
    b_ppm: Ppm = None

    @field_validator("test_date")
    @classmethod
    def _not_future(cls, v: date) -> date:
        from terrabyte.timeutil import today_ist

        if v > today_ist():
            raise ValueError("The test date cannot be in the future")
        if v.year < 2000:
            raise ValueError("Enter the date printed on the card")
        return v


class SoilTestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    field_id: int
    test_date: date
    lab: str | None
    ph: float | None
    ec_ds_m: float | None
    oc_pct: float | None
    n_kg_ha: float | None
    p_kg_ha: float | None
    p_basis: str
    k_kg_ha: float | None
    k_basis: str
    s_ppm: float | None
    zn_ppm: float | None
    fe_ppm: float | None
    mn_ppm: float | None
    cu_ppm: float | None
    b_ppm: float | None
    created_at: datetime


class DoseIn(BaseModel):
    crop: Annotated[str, Field(min_length=2, max_length=40)]
    rdf_id: Annotated[int | None, Field(ge=0)] = None
    field_id: int | None = None
    area_acres: Annotated[float | None, Field(gt=0, le=10_000)] = None
    soil_test_id: int | None = None
    scheme: Literal["mpkv", "national"] = "mpkv"
    carrier: Literal["dap", "ssp", "npk_10_26_26", "npk_12_32_16", "aps_20_20_0_13"] = "dap"
