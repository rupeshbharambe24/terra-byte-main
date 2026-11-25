"""Government schemes and MSP tables from the bundled official reference data."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Query

from terrabyte.errors import ApiError
from terrabyte.reference import LAST_VERIFIED, load
from terrabyte.security import CurrentUser

router = APIRouter(tags=["reference"])

_SCHEME_FIELDS = (
    "id",
    "name_en",
    "name_hi",
    "name_mr",
    "level",
    "ministry_or_department",
    "benefit",
    "eligibility",
    "exclusions",
    "documents_required",
    "how_to_apply",
    "official_url",
    "status",
    "status_note",
    "last_verified",
    "source_urls",
    "notes",
)


def _scheme(row: dict[str, Any]) -> dict[str, Any]:
    return {k: row.get(k) for k in _SCHEME_FIELDS}


def _matches(row: dict[str, Any], q: str) -> bool:
    text = " ".join(
        str(row.get(k) or "")
        for k in (
            "name_en",
            "name_hi",
            "name_mr",
            "benefit",
            "eligibility",
            "ministry_or_department",
        )
    ).lower()
    return all(word in text for word in q.lower().split())


@router.get("/schemes")
def list_schemes(
    _user: CurrentUser,
    level: Literal["central", "maharashtra"] | None = None,
    status: Literal["active", "changed", "closed", "unverified"] | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> dict[str, Any]:
    data = load("schemes.json")
    rows = data["schemes"]
    if level:
        rows = [r for r in rows if r["level"] == level]
    if status:
        rows = [r for r in rows if r["status"] == status]
    if q and q.strip():
        rows = [r for r in rows if _matches(r, q.strip())]
    order = {"active": 0, "changed": 1, "unverified": 2, "closed": 3}
    rows = sorted(rows, key=lambda r: (order.get(r["status"], 9), r["level"], r["name_en"]))
    return {
        "items": [_scheme(r) for r in rows],
        "total": len(rows),
        "status_values": data["meta"]["status_values"],
        "notes": data["meta"]["notes"],
        "last_verified": data["meta"].get("last_verified", LAST_VERIFIED),
    }


@router.get("/schemes/{scheme_id}")
def get_scheme(scheme_id: str, _user: CurrentUser) -> dict[str, Any]:
    row = next((r for r in load("schemes.json")["schemes"] if r["id"] == scheme_id), None)
    if row is None:
        raise ApiError(404, "not_found", "Scheme not found.")
    return _scheme(row)


@router.get("/msp")
def msp(_user: CurrentUser) -> dict[str, Any]:
    """MSP rows grouped by season (newest first) plus sugarcane FRP and the notes on what MSP
    does and does not mean."""
    data = load("msp.json")
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in data["msp"]:
        groups.setdefault((row["season"], row["marketing_year"]), []).append(row)
    latest: dict[str, str] = {}
    for season, year in groups:
        latest[season] = max(latest.get(season, ""), year)
    seasons = [
        {
            "season": season,
            "marketing_year": year,
            "latest": latest[season] == year,
            "rows": rows,
        }
        for (season, year), rows in sorted(
            groups.items(), key=lambda kv: (kv[0][1], kv[0][0]), reverse=True
        )
    ]
    return {
        "seasons": seasons,
        "sugarcane_frp": data["sugarcane_frp"],
        "notes": data["notes"],
        "season_status": data["meta"]["season_status"],
        "unit": data["meta"]["unit"],
        "authority": data["meta"]["authority"],
        "last_verified": data["meta"].get("last_verified", LAST_VERIFIED),
    }
