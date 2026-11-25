from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

from terrabyte.models import BookingStatus, RentalUnit
from terrabyte.schemas.common import BlankToNone, MoneyOut, OptMoneyIn, OptMoneyOut, Reason

# Keys are translated in the frontend (rentals:types.*).
EquipmentType = Literal[
    "tractor",
    "rotavator",
    "cultivator",
    "plough",
    "seed_drill",
    "sprayer",
    "harvester",
    "thresher",
    "reaper",
    "water_pump",
    "trolley",
    "other",
]
EQUIPMENT_TYPES: tuple[str, ...] = EquipmentType.__args__  # type: ignore[attr-defined]

OptText = Annotated[str | None, Field(max_length=2000), BlankToNone]
OptDistrict = Annotated[str | None, Field(max_length=80), BlankToNone]
OptImage = Annotated[str | None, Field(max_length=255), BlankToNone]


class EquipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    owner_name: str
    name: str
    type: str
    rate_per_hour_inr: OptMoneyOut
    rate_per_day_inr: OptMoneyOut
    district: str | None
    description: str | None
    image_path: str | None
    active: bool
    created_at: datetime


class EquipmentIn(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=160)]
    type: EquipmentType
    rate_per_hour_inr: OptMoneyIn = None
    rate_per_day_inr: OptMoneyIn = None
    district: OptDistrict = None
    description: OptText = None
    image_path: OptImage = None
    active: bool = True

    @model_validator(mode="after")
    def _needs_a_rate(self) -> EquipmentIn:
        if self.rate_per_hour_inr is None and self.rate_per_day_inr is None:
            raise ValueError("Give an hourly rate, a daily rate or both")
        return self


class EquipmentUpdate(BaseModel):
    name: Annotated[str | None, Field(min_length=2, max_length=160)] = None
    type: EquipmentType | None = None
    rate_per_hour_inr: OptMoneyIn = None
    rate_per_day_inr: OptMoneyIn = None
    district: OptDistrict = None
    description: OptText = None
    image_path: OptImage = None
    active: bool | None = None


class BookingIn(BaseModel):
    equipment_id: int
    unit: RentalUnit
    start_at: AwareDatetime
    end_at: AwareDatetime
    note: Annotated[str | None, Field(max_length=500), BlankToNone] = None


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    equipment_id: int
    equipment_name: str
    equipment_type: str
    owner_id: int
    owner_name: str
    farmer_id: int
    farmer_name: str
    farmer_phone: str | None = None  # only shown to the equipment owner
    start_at: datetime
    end_at: datetime
    unit: RentalUnit
    units: int
    rate_inr: MoneyOut
    amount_inr: MoneyOut
    status: BookingStatus
    note: str | None
    status_reason: str | None
    created_at: datetime
    accepted_at: datetime | None
    rejected_at: datetime | None
    cancelled_at: datetime | None
    completed_at: datetime | None


class BusySlot(BaseModel):
    start_at: datetime
    end_at: datetime
    status: BookingStatus


class BookingAction(BaseModel):
    reason: Reason = None
