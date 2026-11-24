from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from terrabyte.models import Language, UserRole, UserStatus
from terrabyte.schemas.common import BlankToNone, IndianMobile

OptStr80 = Annotated[str | None, BlankToNone, Field(max_length=80)]
OptStr120 = Annotated[str | None, BlankToNone, Field(max_length=120)]
OptStr160 = Annotated[str | None, BlankToNone, Field(max_length=160)]
OptEmail = Annotated[EmailStr | None, BlankToNone]
# Rough bounding box of India; rejects swapped lat/lon and obvious typos.
Lat = Annotated[float | None, Field(ge=6.0, le=38.0)]
Lon = Annotated[float | None, Field(ge=68.0, le=98.0)]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    email: str | None
    role: UserRole
    status: UserStatus
    preferred_language: Language
    organization: str | None
    qualifications: str | None
    state: str | None
    district: str | None
    village: str | None
    lat: float | None
    lon: float | None
    created_at: datetime


class AdminUserOut(UserOut):
    status_reason: str | None
    status_changed_at: datetime | None


class UserPage(BaseModel):
    items: list[AdminUserOut]
    total: int
    limit: int
    offset: int


class RegisterIn(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=120)]
    phone: IndianMobile
    password: Annotated[str, Field(min_length=8, max_length=128)]
    role: UserRole = UserRole.farmer
    email: OptEmail = None
    preferred_language: Language = Language.en
    organization: OptStr160 = None
    qualifications: Annotated[str | None, BlankToNone, Field(max_length=2000)] = None
    state: OptStr80 = None
    district: OptStr80 = None
    village: OptStr120 = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Name is too short")
        return v

    @field_validator("email")
    @classmethod
    def _lower_email(cls, v: str | None) -> str | None:
        return v.lower() if v else v


class LoginIn(BaseModel):
    identifier: Annotated[str, Field(min_length=3, max_length=254, description="Phone or email")]
    password: Annotated[str, Field(min_length=1, max_length=128)]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 (OAuth2 token type, not a secret)
    expires_in: int
    user: UserOut


class RegisterOut(BaseModel):
    user: UserOut
    requires_approval: bool
    access_token: str | None = None
    expires_in: int | None = None


class MeUpdate(BaseModel):
    name: Annotated[str | None, Field(min_length=2, max_length=120)] = None
    email: OptEmail = None
    preferred_language: Language | None = None
    organization: OptStr160 = None
    qualifications: Annotated[str | None, BlankToNone, Field(max_length=2000)] = None
    state: OptStr80 = None
    district: OptStr80 = None
    village: OptStr120 = None
    lat: Lat = None
    lon: Lon = None

    @field_validator("email")
    @classmethod
    def _lower_email(cls, v: str | None) -> str | None:
        return v.lower() if v else v


class PasswordChange(BaseModel):
    current_password: Annotated[str, Field(min_length=1, max_length=128)]
    new_password: Annotated[str, Field(min_length=8, max_length=128)]


class StatusChangeIn(BaseModel):
    reason: Annotated[str | None, BlankToNone, Field(max_length=500)] = None
