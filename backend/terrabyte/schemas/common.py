"""Shared validators."""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Annotated, Generic, TypeVar

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field, PlainSerializer

_PHONE_RE = re.compile(r"^[6-9]\d{9}$")


def normalize_phone(value: str) -> str:
    """Normalise an Indian mobile number to its 10 digits (drops spaces, dashes, +91 or 0)."""
    digits = re.sub(r"[\s\-()]", "", str(value))
    if digits.startswith("+91"):
        digits = digits[3:]
    elif len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits


def _check_phone(value: str) -> str:
    phone = normalize_phone(value)
    if not _PHONE_RE.match(phone):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return phone


def _blank_to_none(value: object) -> object:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


IndianMobile = Annotated[str, AfterValidator(_check_phone)]
BlankToNone = BeforeValidator(_blank_to_none)


def _money(value: Decimal | None) -> float | None:
    return None if value is None else round(float(value), 2)


# Money leaves the API as a JSON number rounded to paise; it enters as a Decimal with 2 places.
MoneyOut = Annotated[Decimal, PlainSerializer(_money, return_type=float)]
OptMoneyOut = Annotated[Decimal | None, PlainSerializer(_money, return_type=float | None)]
MoneyIn = Annotated[Decimal, Field(gt=0, le=Decimal("10000000"), max_digits=10, decimal_places=2)]
OptMoneyIn = Annotated[
    Decimal | None, Field(gt=0, le=Decimal("10000000"), max_digits=10, decimal_places=2)
]
Reason = Annotated[str | None, Field(max_length=500), BeforeValidator(_blank_to_none)]

T = TypeVar("T")


class Page(BaseModel, Generic[T]):  # noqa: UP046 (pydantic generic model)
    items: list[T]
    total: int
    limit: int
    offset: int


class ReasonIn(BaseModel):
    reason: Reason = None
