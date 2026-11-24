from __future__ import annotations

import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from terrabyte.models import ConsultationStatus, UserRole
from terrabyte.schemas.common import BlankToNone

# Keys are translated in the frontend (advice:categories.*).
ConsultationCategory = Literal[
    "disease",
    "pest",
    "nutrient",
    "irrigation",
    "soil",
    "crop_planning",
    "market",
    "schemes",
    "other",
]

OptStr = Annotated[str | None, Field(max_length=200), BlankToNone]
OptImage = Annotated[str | None, Field(max_length=255), BlankToNone]


class ConsultationIn(BaseModel):
    crop: Annotated[str | None, Field(max_length=80), BlankToNone] = None
    category: ConsultationCategory
    question: Annotated[str, Field(min_length=10, max_length=4000)]
    image_path: OptImage = None
    kvk_id: int | None = None


class MessageIn(BaseModel):
    body: Annotated[str, Field(min_length=1, max_length=4000)]
    image_path: OptImage = None

    @field_validator("body")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_id: int
    author_name: str
    author_role: UserRole
    body: str
    image_path: str | None
    created_at: datetime


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    farmer_id: int
    farmer_name: str
    farmer_district: str | None
    expert_id: int | None
    expert_name: str | None
    kvk_id: int | None
    kvk_name: str | None
    crop: str | None
    category: str | None
    question: str
    image_path: str | None
    status: ConsultationStatus
    created_at: datetime
    updated_at: datetime
    assigned_at: datetime | None
    first_response_at: datetime | None
    closed_at: datetime | None
    message_count: int = 0


class ConsultationDetail(ConsultationOut):
    messages: list[MessageOut]


class StatusIn(BaseModel):
    status: Literal["answered", "closed"]


class AssignIn(BaseModel):
    expert_id: int


_PINCODE = re.compile(r"^[1-9]\d{5}$")


class KVKIn(BaseModel):
    """One KVK directory row (also the format of ``terrabyte-import-kvk`` JSON files)."""

    model_config = ConfigDict(extra="ignore")

    name: Annotated[str, Field(min_length=3, max_length=200)]
    district: Annotated[str, Field(min_length=2, max_length=80)]
    state: Annotated[str, Field(min_length=2, max_length=80)]
    host_organisation: OptStr = None
    address: Annotated[str | None, Field(max_length=1000), BlankToNone] = None
    pincode: Annotated[str | None, Field(max_length=6), BlankToNone] = None
    phone: Annotated[str | None, Field(max_length=80), BlankToNone] = None
    email: Annotated[str | None, Field(max_length=254), BlankToNone] = None
    website: Annotated[HttpUrl | None, BlankToNone] = None
    lat: Annotated[float | None, Field(ge=6.0, le=38.0)] = None
    lon: Annotated[float | None, Field(ge=68.0, le=98.0)] = None
    source_url: Annotated[HttpUrl | None, BlankToNone] = None
    verified_on: date | None = None

    @field_validator("name", "district", "state")
    @classmethod
    def _squash(cls, v: str) -> str:
        return " ".join(v.split())

    @field_validator("pincode", mode="before")
    @classmethod
    def _pincode(cls, v: object) -> object:
        if isinstance(v, int):
            v = str(v)
        if isinstance(v, str):
            v = v.replace(" ", "")
            if v and not _PINCODE.match(v):
                raise ValueError("PIN code must be 6 digits")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v: str | None) -> str | None:
        if v and "@" not in v:
            raise ValueError("Not an email address")
        return v.lower() if v else v

    def to_columns(self) -> dict[str, object]:
        data = self.model_dump()
        for key in ("website", "source_url"):
            data[key] = str(data[key]) if data[key] is not None else None
        return data


class KVKUpdate(BaseModel):
    name: Annotated[str | None, Field(min_length=3, max_length=200)] = None
    district: Annotated[str | None, Field(min_length=2, max_length=80)] = None
    state: Annotated[str | None, Field(min_length=2, max_length=80)] = None
    host_organisation: OptStr = None
    address: Annotated[str | None, Field(max_length=1000), BlankToNone] = None
    pincode: Annotated[str | None, Field(pattern=r"^[1-9]\d{5}$"), BlankToNone] = None
    phone: Annotated[str | None, Field(max_length=80), BlankToNone] = None
    email: Annotated[str | None, Field(max_length=254), BlankToNone] = None
    website: Annotated[HttpUrl | None, BlankToNone] = None
    lat: Annotated[float | None, Field(ge=6.0, le=38.0)] = None
    lon: Annotated[float | None, Field(ge=68.0, le=98.0)] = None
    source_url: Annotated[HttpUrl | None, BlankToNone] = None
    verified_on: date | None = None


class KVKOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    district: str
    state: str
    host_organisation: str | None
    address: str | None
    pincode: str | None
    phone: str | None
    email: str | None
    website: str | None
    lat: float | None
    lon: float | None
    source_url: str | None
    verified_on: date | None
    created_at: datetime


class DataImportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    source: str
    created: int
    updated: int
    skipped: int
    errors: list[str] | None
    imported_at: datetime


class KVKStatus(BaseModel):
    total: int
    verified: int
    districts: list[str]
    states: list[str]
    last_verified_on: date | None
    imports: list[DataImportOut]


class ArticleIn(BaseModel):
    title: Annotated[str, Field(min_length=5, max_length=200)]
    crop: Annotated[str | None, Field(max_length=80), BlankToNone] = None
    body: Annotated[str, Field(min_length=20, max_length=20000)]
    published: bool = False


class ArticleUpdate(BaseModel):
    title: Annotated[str | None, Field(min_length=5, max_length=200)] = None
    crop: Annotated[str | None, Field(max_length=80), BlankToNone] = None
    body: Annotated[str | None, Field(min_length=20, max_length=20000)] = None
    published: bool | None = None


class ArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_id: int
    author_name: str
    title: str
    crop: str | None
    body: str
    published: bool
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
