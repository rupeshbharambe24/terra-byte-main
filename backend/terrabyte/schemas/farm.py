from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from terrabyte.models import LedgerType
from terrabyte.schemas.common import BlankToNone, MoneyIn, MoneyOut
from terrabyte.schemas.users import Lat, Lon

# Category keys are translated in the frontend (farm:ledger.categories.*).
EXPENSE_CATEGORIES = (
    "seeds",
    "fertilizer",
    "pesticide",
    "farm_inputs",
    "labour",
    "equipment_rental",
    "irrigation_power",
    "fuel",
    "transport",
    "other_expense",
)
INCOME_CATEGORIES = ("crop_sale", "subsidy", "other_income")
LedgerCategory = Literal[
    "seeds",
    "fertilizer",
    "pesticide",
    "farm_inputs",
    "labour",
    "equipment_rental",
    "irrigation_power",
    "fuel",
    "transport",
    "other_expense",
    "crop_sale",
    "subsidy",
    "other_income",
]

OptStr60 = Annotated[str | None, Field(max_length=60), BlankToNone]
OptStr80 = Annotated[str | None, Field(max_length=80), BlankToNone]
OptSeason = Annotated[str | None, Field(max_length=40, pattern=r"^[a-z_]+$"), BlankToNone]


def check_category(type_: LedgerType | None, category: str | None) -> None:
    if type_ is None or category is None:
        return
    allowed = EXPENSE_CATEGORIES if type_ == LedgerType.expense else INCOME_CATEGORIES
    if category not in allowed:
        raise ValueError(f"Category {category} is not a {type_.value} category")


class FieldIn(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=120)]
    area_acres: Annotated[float, Field(gt=0, le=10_000)]
    soil_type: OptStr60 = None
    irrigation_source: OptStr60 = None
    current_crop: OptStr80 = None
    season: OptSeason = None
    sowing_date: date | None = None
    lat: Lat = None
    lon: Lon = None


class FieldUpdate(BaseModel):
    name: Annotated[str | None, Field(min_length=1, max_length=120)] = None
    area_acres: Annotated[float | None, Field(gt=0, le=10_000)] = None
    soil_type: OptStr60 = None
    irrigation_source: OptStr60 = None
    current_crop: OptStr80 = None
    season: OptSeason = None
    sowing_date: date | None = None
    lat: Lat = None
    lon: Lon = None


class FieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    area_acres: float
    soil_type: str | None
    irrigation_source: str | None
    current_crop: str | None
    season: str | None = None
    sowing_date: date | None
    lat: float | None
    lon: float | None
    created_at: datetime


class LedgerIn(BaseModel):
    entry_date: date
    type: LedgerType
    category: LedgerCategory
    amount_inr: MoneyIn
    field_id: int | None = None
    note: Annotated[str | None, Field(max_length=500), BlankToNone] = None

    @model_validator(mode="after")
    def _category_matches_type(self) -> LedgerIn:
        check_category(self.type, self.category)
        return self


class LedgerUpdate(BaseModel):
    entry_date: date | None = None
    type: LedgerType | None = None
    category: LedgerCategory | None = None
    amount_inr: MoneyIn | None = None
    field_id: int | None = None
    note: Annotated[str | None, Field(max_length=500), BlankToNone] = None


class LedgerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entry_date: date
    type: LedgerType
    category: str
    amount_inr: MoneyOut
    field_id: int | None
    field_name: str | None = None
    note: str | None
    order_id: int | None
    booking_id: int | None
    created_at: datetime


class MonthTotal(BaseModel):
    month: str  # YYYY-MM
    income: MoneyOut
    expense: MoneyOut


class CategoryTotal(BaseModel):
    type: LedgerType
    category: str
    amount: MoneyOut


class FieldTotal(BaseModel):
    field_id: int | None
    field_name: str | None
    income: MoneyOut
    expense: MoneyOut


class LedgerSummary(BaseModel):
    date_from: date | None
    date_to: date | None
    income: MoneyOut
    expense: MoneyOut
    net: MoneyOut
    entries: int
    by_month: list[MonthTotal]
    by_category: list[CategoryTotal]
    by_field: list[FieldTotal]
