"""Small helpers shared by the services."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from terrabyte.errors import ApiError

PAISE = Decimal("0.01")


def money(value: Decimal | int | float | str) -> Decimal:
    """Round to paise. Floats (SQLite NUMERIC) go through ``str`` to avoid binary noise."""
    if isinstance(value, float):
        value = str(value)
    return Decimal(value).quantize(PAISE, rounding=ROUND_HALF_UP)


def apply_patch(obj: Any, changes: dict[str, Any], required: set[str]) -> None:
    """Copy PATCH fields onto ``obj``; columns in ``required`` cannot be set to null."""
    for key, value in changes.items():
        if value is None and key in required:
            raise ApiError(422, "validation_error", f"{key} cannot be empty.")
    for key, value in changes.items():
        setattr(obj, key, value)
