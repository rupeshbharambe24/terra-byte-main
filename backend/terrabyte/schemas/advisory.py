from __future__ import annotations

import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    computed_field,
    field_validator,
    model_validator,
)

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


def _first_token(value: str) -> str:
    """'https://x (read via Wayback ...)' -> 'https://x'."""
    return value.strip().split()[0] if value.strip() else ""


def _join(value: object) -> object:
    """Lists of phones / emails (research files) -> one comma-separated string."""
    if isinstance(value, list):
        items = [str(v).strip() for v in value if v is not None and str(v).strip()]
        return ", ".join(items) or None
    return value


def _first_url(value: object) -> object:
    if isinstance(value, list):
        urls = [_first_token(str(v)) for v in value if v]
        return next((u for u in urls if u.startswith(("http://", "https://"))), None)
    if isinstance(value, str):
        return _first_token(value) or None
    return value


def coords_approximate(precision: str | None) -> bool:
    """True unless the source says the point is the KVK site itself."""
    if not precision:
        return True
    p = precision.lower()
    return not (p.startswith("site-level") or p.startswith("as published"))


class KVKIn(BaseModel):
    """One KVK directory row (also the format of ``terrabyte-import-kvk`` JSON files)."""

    model_config = ConfigDict(extra="ignore")

    name: Annotated[str, Field(min_length=3, max_length=200)]
    district: Annotated[str, Field(min_length=2, max_length=80)]
    state: Annotated[str, Field(min_length=2, max_length=80)]
    host_organisation: OptStr = None
    taluka: Annotated[str | None, Field(max_length=120), BlankToNone] = None
    address: Annotated[str | None, Field(max_length=1000), BlankToNone] = None
    pincode: Annotated[str | None, Field(max_length=6), BlankToNone] = None
    phone: Annotated[str | None, Field(max_length=200), BlankToNone] = None
    email: Annotated[str | None, Field(max_length=500), BlankToNone] = None
    website: Annotated[HttpUrl | None, BlankToNone] = None
    lat: Annotated[float | None, Field(ge=6.0, le=38.0)] = None
    lon: Annotated[float | None, Field(ge=68.0, le=98.0)] = None
    coords_precision: Annotated[str | None, Field(max_length=300), BlankToNone] = None
    source_url: Annotated[HttpUrl | None, BlankToNone] = None
    sources: list[str] | None = None
    verified_on: date | None = None

    @model_validator(mode="before")
    @classmethod
    def _research_shape(cls, data: object) -> object:
        """Accept the research-file shape: lists of phones/emails/URLs."""
        if not isinstance(data, dict):
            return data
        data = dict(data)
        raw_sources = data.get("source_url")
        if data.get("sources") is None and isinstance(raw_sources, list):
            data["sources"] = [
                u for u in (_first_token(str(v)) for v in raw_sources if v) if u.startswith("http")
            ][:20]
        data["source_url"] = _first_url(raw_sources)
        data["website"] = _first_url(data.get("website"))
        data["phone"] = _join(data.get("phone"))
        data["email"] = _join(data.get("email"))
        return data

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
        if not v:
            return v
        parts = [p.strip().lower() for p in v.split(",") if p.strip()]
        if any("@" not in p or " " in p for p in parts):
            raise ValueError("Not an email address")
        return ", ".join(parts)

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
    phone: Annotated[str | None, Field(max_length=200), BlankToNone] = None
    email: Annotated[str | None, Field(max_length=500), BlankToNone] = None
    website: Annotated[HttpUrl | None, BlankToNone] = None
    lat: Annotated[float | None, Field(ge=6.0, le=38.0)] = None
    lon: Annotated[float | None, Field(ge=68.0, le=98.0)] = None
    coords_precision: Annotated[str | None, Field(max_length=300), BlankToNone] = None
    source_url: Annotated[HttpUrl | None, BlankToNone] = None
    verified_on: date | None = None


class KVKOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    district: str
    state: str
    host_organisation: str | None
    taluka: str | None = None
    address: str | None
    pincode: str | None
    phone: str | None
    email: str | None
    website: str | None
    lat: float | None
    lon: float | None
    coords_precision: str | None = None
    source_url: str | None
    sources: list[str] | None = None
    verified_on: date | None
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def coords_approximate(self) -> bool:
        return self.lat is not None and coords_approximate(self.coords_precision)


class KVKNearest(KVKOut):
    distance_km: float


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
