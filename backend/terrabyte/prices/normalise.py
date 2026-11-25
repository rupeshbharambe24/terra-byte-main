"""Clean market, commodity and price values coming from Agmarknet / data.gov.in and legacy files."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation

# Short market names used by the 2025 prototype's onion file -> Agmarknet market names (the
# same file's other columns and the potato/tomato files use the long form). Only unambiguous
# renames are listed; Agmarknet 2.0 names such as "APMC Junnar" are kept as separate markets.
MARKET_ALIASES = {
    "Alephata": "Junnar(Alephata)",
    "Chakan": "Khed(Chakan)",
    "Narayangaon": "Junnar(Narayangaon)",
    "Otur": "Junnar(Otur)",
    "Khadki": "Pune(Khadiki)",
    "Pune(Khadki)": "Pune(Khadiki)",
    "Manjri": "Pune(Manjri)",
    "Moshi": "Pune(Moshi)",
    "Pimpri": "Pune(Pimpri)",
}

COMMODITY_ALIASES = {
    "Bhendi": "Bhindi(Ladies Finger)",
    "Ladies Finger": "Bhindi(Ladies Finger)",
}


def clean_text(value: object) -> str:
    """Trim and collapse internal whitespace (Agmarknet names often end with a space)."""
    if value is None:
        return ""
    return " ".join(str(value).split())


def market_name(value: object) -> str:
    name = clean_text(value)
    return MARKET_ALIASES.get(name, name)


def commodity_name(value: object) -> str:
    name = clean_text(value)
    return COMMODITY_ALIASES.get(name, name)


def price(value: object) -> Decimal | None:
    """Parse a Rs/quintal price that may be a string, int or float. Non-positive -> None."""
    if value is None:
        return None
    text = clean_text(value).replace(",", "")
    if not text or text.upper() in {"NA", "NR", "-"}:
        return None
    try:
        number = Decimal(text)
    except InvalidOperation:
        return None
    if not number.is_finite() or number <= 0:
        return None
    return number.quantize(Decimal("0.01"))


def arrival_date(value: object) -> date | None:
    """Parse ``dd/mm/yyyy``, ``dd-mm-yyyy`` or ISO dates."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = clean_text(value)
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None
