"""Shared validators."""

from __future__ import annotations

import re
from typing import Annotated

from pydantic import AfterValidator, BeforeValidator

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
