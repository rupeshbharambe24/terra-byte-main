"""Farm advisories derived from the forecast by explicit, documented rules (pure functions).

Every rule states its threshold and where the threshold comes from. The advisory text is
translated in the frontend (agro:weather.advisories.<id>); the API returns the rule id and the
forecast values that triggered it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# IMD rainfall intensity categories (mm in 24 h): heavy 64.5-115.5, very heavy 115.6-204.4,
# extremely heavy >= 204.5. Source: IMD Standard Operation Procedure, Weather Forecasting and
# Warning (2021). Heat/cold thresholds: IMD heat-wave and cold-wave FAQs.
IMD_HEAVY_RAIN_MM = 64.5
IMD_RAIN_SOURCE = "https://mausam.imd.gov.in/imd_latest/contents/pdf/forecasting_sop.pdf"
IMD_HEAT_SOURCE = "https://internal.imd.gov.in/section/nhac/dynamic/FAQ_heat_wave.pdf"
IMD_COLD_SOURCE = "https://internal.imd.gov.in/section/nhac/dynamic/faq.pdf"

RULES: list[dict[str, str | None]] = [
    {
        "id": "rain_48h",
        "rule": "Total forecast rain in the next 48 hours >= 10 mm",
        "basis": "TerraByte rule of thumb (not an official threshold): rain soon after spraying "
        "washes the spray off, and >= 10 mm usually wets the root zone enough to postpone "
        "irrigation; also postpone top-dressing fertilizer.",
        "source_url": None,
    },
    {
        "id": "wind_spray",
        "rule": "Hourly wind speed above 15 km/h in the next 24 hours",
        "basis": "Common pesticide-label / extension guidance: do not spray in winds above "
        "about 15 km/h because of drift.",
        "source_url": None,
    },
    {
        "id": "heavy_rain",
        "rule": "Any day with forecast rain >= 64.5 mm",
        "basis": "IMD 'heavy rainfall' category (64.5-115.5 mm in 24 h).",
        "source_url": IMD_RAIN_SOURCE,
    },
    {
        "id": "heat",
        "rule": "Any day with forecast maximum temperature >= 40 C",
        "basis": "IMD uses a maximum of 40 C as the plains threshold for considering a heat wave.",
        "source_url": IMD_HEAT_SOURCE,
    },
    {
        "id": "cold",
        "rule": "Any day with forecast minimum temperature <= 4 C",
        "basis": "IMD cold-wave criterion for plains (minimum temperature <= 4 C).",
        "source_url": IMD_COLD_SOURCE,
    },
    {
        "id": "dry_week",
        "rule": "Total forecast rain in the next 7 days < 2.5 mm",
        "basis": "Below IMD 'light rain' (2.5 mm); plan irrigation from the water-balance page.",
        "source_url": IMD_RAIN_SOURCE,
    },
]
RULES_BY_ID = {r["id"]: r for r in RULES}


@dataclass
class Advisory:
    id: str
    severity: str  # "warning" | "info"
    values: dict[str, Any] = field(default_factory=dict)


def advisories(hourly: list[dict[str, Any]], daily: list[dict[str, Any]]) -> list[Advisory]:
    """``hourly`` = future hours (oldest first) with ``precipitation_mm`` and ``wind_kmh``;
    ``daily`` = today and the following days with ``date``, ``rain_mm``, ``tmax_c``, ``tmin_c``."""
    out: list[Advisory] = []
    rain_48 = sum(h.get("precipitation_mm") or 0 for h in hourly[:48])
    if rain_48 >= 10:
        out.append(Advisory("rain_48h", "warning", {"mm": round(rain_48, 1)}))
    winds = [h.get("wind_kmh") or 0 for h in hourly[:24]]
    if winds and max(winds) > 15:
        out.append(Advisory("wind_spray", "warning", {"kmh": round(max(winds))}))
    heavy = [d for d in daily if (d.get("rain_mm") or 0) >= IMD_HEAVY_RAIN_MM]
    if heavy:
        out.append(
            Advisory("heavy_rain", "warning", {"date": heavy[0]["date"], "mm": heavy[0]["rain_mm"]})
        )
    hot = [d for d in daily if d.get("tmax_c") is not None and d["tmax_c"] >= 40]
    if hot:
        out.append(Advisory("heat", "warning", {"date": hot[0]["date"], "c": hot[0]["tmax_c"]}))
    cold = [d for d in daily if d.get("tmin_c") is not None and d["tmin_c"] <= 4]
    if cold:
        out.append(Advisory("cold", "warning", {"date": cold[0]["date"], "c": cold[0]["tmin_c"]}))
    week_rain = sum(d.get("rain_mm") or 0 for d in daily[:7])
    if daily and week_rain < 2.5:
        out.append(Advisory("dry_week", "info", {"mm": round(week_rain, 1)}))
    return out
