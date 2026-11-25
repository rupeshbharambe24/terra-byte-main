from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class PriceRowOut(BaseModel):
    market: str
    district: str
    state: str
    commodity: str
    variety: str
    grade: str
    arrival_date: date
    min_price: float | None
    max_price: float | None
    modal_price: float
    source: str
    days_old: int
    stale: bool  # older than 7 days


class LatestPricesOut(BaseModel):
    items: list[PriceRowOut]
    as_of: date | None
    stale_after_days: int = 7


class SeriesOut(BaseModel):
    market: str
    commodity: str
    district: str
    state: str
    rows: int
    first_date: date
    last_date: date


class CommodityOut(BaseModel):
    commodity: str
    markets: int
    last_date: date


class HistoryPoint(BaseModel):
    date: date
    modal: float
    min: float | None
    max: float | None


class HistoryOut(BaseModel):
    market: str
    commodity: str
    variety: str
    district: str
    points: list[HistoryPoint]
    sources: list[str]


class ForecastPointOut(BaseModel):
    date: date
    horizon_days: int
    point: float | None
    low: float
    high: float


class ForecastSkill(BaseModel):
    mase_naive: float
    mase_seasonal_naive: float
    mase_ets: float
    coverage_80: float | None
    n_origins: int
    first_origin: date
    last_origin: date
    evaluated_at: datetime


class ForecastOut(BaseModel):
    status: Literal["ok", "stale", "not_evaluated", "no_data"]
    market: str
    commodity: str
    variety: str | None = None
    last_date: date | None = None
    last_price: float | None = None
    days_old: int | None = None
    method: Literal["ets", "naive"] | None = None
    points: list[ForecastPointOut] = []
    ranges: list[ForecastPointOut] = []
    skill: ForecastSkill | None = None


class MspOut(BaseModel):
    crop: str
    crop_hi: str | None
    crop_mr: str | None
    season: str
    marketing_year: str
    msp_inr_per_quintal: float
    source_url: str
    announced_on: str | None


class MspForCommodity(BaseModel):
    commodity: str
    has_msp: bool
    rows: list[MspOut]
    note: str | None = None


class PriceImportOut(BaseModel):
    id: int
    source: str
    created: int
    updated: int
    skipped: int
    errors: list[str] | None
    imported_at: datetime


class MyPricesOut(BaseModel):
    crops: list[str]
    district: str | None
    items: list[PriceRowOut]
    as_of: date | None
