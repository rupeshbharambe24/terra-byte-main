"""FAO-56 crop water requirement and a daily root-zone water balance (pure functions).

Source: Allen, Pereira, Raes & Smith (1998), FAO Irrigation and Drainage Paper 56
(https://www.fao.org/4/x0490e/x0490e00.htm); crop parameters from ``fao56_crops.json``.

- Kc curve (FAO-56 Eq. 66, Fig. 25): Kc_ini during the initial stage, linear to Kc_mid over the
  development stage, Kc_mid in mid-season, linear to Kc_end over the late season.
- ETc = Kc x ET0 (Eq. 58); ET0 = Open-Meteo ``et0_fao_evapotranspiration`` (FAO-56 Penman-Monteith).
- Root-zone depletion (Eq. 85): Dr_i = Dr_(i-1) - (P - RO)_i - I_i + ETc_i + DP_i, with runoff RO
  taken as 0 and rain beyond field capacity lost to deep percolation DP (so Dr >= 0). This is the
  effective-rainfall method recommended in the agronomy README: effective rain is the part of the
  day's rain that the root zone can store.
- Rain below 0.2 x ET0 on a day is treated as fully evaporated (FAO-56, Chapter 7, Eq. 77 notes).
- TAW = 1000 (theta_FC - theta_WP) Zr (Eq. 82); RAW = p x TAW (Eq. 83); p adjusted for ETc:
  p = p_table + 0.04 (5 - ETc), limited to 0.1-0.8 (Table 22 footnote). Irrigate when Dr >= RAW.
- Root depth grows linearly from 0.2 m at sowing to Zr max at the start of mid-season (FAO-56
  gives 0.15-0.20 m as the initial depth; linear growth is our implementation choice).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from terrabyte.reference import load

LITRES_PER_MM_PER_ACRE = 4046.8564  # 1 mm over 1 m2 = 1 litre; 1 acre = 4046.8564 m2
INITIAL_ROOT_DEPTH_M = 0.2

# FAO-56 Table 19 "Typical soil water characteristics for different soil types":
# theta_FC - theta_WP (m3/m3) ranges; we use the midpoint, x1000 = mm of water per m of soil.
SOIL_AWC_SOURCE = {
    "name": "FAO-56 Table 19, typical soil water characteristics (midpoint of theta_FC - theta_WP)",
    "url": "https://www.fao.org/4/x0490e/x0490e0c.htm",
}
SOIL_AWC_MM_PER_M: dict[str, float] = {
    "sand": 80,  # 0.05-0.11
    "loamy_sand": 90,  # 0.06-0.12
    "sandy_loam": 130,  # 0.11-0.15
    "loam": 155,  # 0.13-0.18
    "silt_loam": 160,  # 0.13-0.19
    "silty_clay_loam": 155,  # 0.13-0.18
    "silty_clay": 160,  # 0.13-0.19
    "clay": 160,  # 0.12-0.20
}
# Farmer-facing soil names -> FAO texture class (our mapping; labelled as an assumption).
SOIL_TYPE_TEXTURE: dict[str, str] = {
    "deep black": "clay",
    "black": "clay",
    "medium black": "silty_clay",
    "shallow black": "loam",
    "red": "sandy_loam",
    "laterite": "sandy_loam",
    "sandy": "loamy_sand",
    "alluvial": "loam",
    "loam": "loam",
    "clay": "clay",
}

# Crops whose FAO-56 parameters we use, and the stage set (row) for each. Chickpea (no FAO stage
# lengths), tur, okra and pomegranate (not in FAO-56) and grapes (two pruning cycles a year) are
# not supported yet.
_STAGE_ROW: dict[str, tuple[str | None, int]] = {
    "cotton_bt": (None, 3),
    "soybean": (None, 0),
    "wheat": (None, 0),
    "rice_paddy": (None, 0),
    "jowar_sorghum": (None, 0),
    "bajra_pearl_millet": (None, 0),
    "maize": (None, 0),  # kharif row; rabi row chosen by season below
    "sugarcane": ("virgin", 0),  # suru (12-13 months); see fao56_crops.json notes
    "onion": (None, 0),
    "tomato": (None, 0),
    "potato": (None, 0),
    "brinjal": (None, 0),
    "chilli": (None, 0),
    "groundnut": (None, 0),
    "banana": ("year1", 0),
}


def _num(value: Any) -> tuple[float, bool]:
    """FAO value or range string ("1.15-1.20", "0.70-0.50") -> (value, is_range_midpoint)."""
    if isinstance(value, int | float):
        return float(value), False
    if isinstance(value, dict):  # banana: per-year values
        return _num(value["year1"])
    parts = [float(x) for x in str(value).split("-")]
    if len(parts) == 1:
        return parts[0], False
    return (parts[0] + parts[1]) / 2, True


@dataclass
class CropParams:
    crop: str
    fao56_name: str
    is_proxy: bool
    kc_ini: float
    kc_mid: float
    kc_end: float
    zr_max_m: float
    p: float
    stages: tuple[int, int, int, int]  # initial, development, mid, late (days)
    stage_region: str | None
    notes: list[str] = field(default_factory=list)

    @property
    def total_days(self) -> int:
        return sum(self.stages)


def supported_crops() -> list[str]:
    return list(_STAGE_ROW)


def crop_params(crop: str, season: str | None = None) -> CropParams | None:
    """FAO-56 parameters for a crop key, or None when FAO-56 data is not available."""
    if crop not in _STAGE_ROW:
        return None
    row = next(c for c in load("fao56_crops.json")["crops"] if c["crop"] == crop)
    group, index = _STAGE_ROW[crop]
    if crop == "maize" and season == "rabi":
        index = 1
    stage_sets = row["stage_lengths_days"]
    stage = (stage_sets[group] if group else stage_sets)[index]
    notes = []
    values = {}
    for name in ("Kc_ini", "Kc_mid", "Kc_end", "root_depth_m"):
        v, is_range = _num(row[name])
        values[name] = v
        if is_range:
            notes.append(f"{name}: FAO-56 gives a range ({row[name]}); the midpoint is used.")
    if row.get("is_proxy"):
        notes.append(f"FAO-56 has no entry for this crop; {row['fao56_name']} is used as a proxy.")
    if group == "year1":
        notes.append("First-year (plant crop) values are used.")
    return CropParams(
        crop=crop,
        fao56_name=row["fao56_name"],
        is_proxy=bool(row.get("is_proxy")),
        kc_ini=values["Kc_ini"],
        kc_mid=values["Kc_mid"],
        kc_end=values["Kc_end"],
        zr_max_m=values["root_depth_m"],
        p=float(row["p_depletion"]),
        stages=(stage["initial"], stage["development"], stage["mid"], stage["late"]),
        stage_region=stage.get("region"),
        notes=notes,
    )


def stage_and_kc(params: CropParams, day: int) -> tuple[str, float | None]:
    """Growth stage and Kc on day ``day`` after sowing (0 = sowing day), FAO-56 Eq. 66."""
    ini, dev, mid, late = params.stages
    if day < 0:
        return "not_sown", None
    if day < ini:
        return "initial", params.kc_ini
    if day < ini + dev:
        frac = (day - ini) / dev
        return "development", params.kc_ini + frac * (params.kc_mid - params.kc_ini)
    if day < ini + dev + mid:
        return "mid", params.kc_mid
    if day < ini + dev + mid + late:
        frac = (day - ini - dev - mid) / late
        return "late", params.kc_mid + frac * (params.kc_end - params.kc_mid)
    return "harvested", None


def root_depth(params: CropParams, day: int) -> float:
    ini, dev, _, _ = params.stages
    zr0 = min(INITIAL_ROOT_DEPTH_M, params.zr_max_m)
    frac = min(1.0, max(0.0, day / (ini + dev)))
    return zr0 + frac * (params.zr_max_m - zr0)


def adjusted_p(p_table: float, etc_mm: float) -> float:
    return min(0.8, max(0.1, p_table + 0.04 * (5 - etc_mm)))


@dataclass
class DayBalance:
    date: date
    is_forecast: bool
    stage: str
    kc: float | None
    et0_mm: float
    etc_mm: float
    rain_mm: float
    effective_rain_mm: float
    depletion_mm: float  # at the end of the day
    taw_mm: float
    raw_mm: float


def water_balance(
    params: CropParams,
    sowing: date,
    days: list[tuple[date, float, float]],
    today: date,
    awc_mm_per_m: float,
    start: date,
) -> list[DayBalance]:
    """Daily balance over ``days`` = [(date, et0_mm, rain_mm)], starting at field capacity
    (Dr = 0) at the start of ``start``. Days before ``start`` are reported with no depletion."""
    out = []
    dr = 0.0
    for day, et0, rain in days:
        n = (day - sowing).days
        stage, kc = stage_and_kc(params, n)
        etc = (kc or 0.0) * et0
        zr = root_depth(params, max(n, 0))
        taw = awc_mm_per_m * zr
        raw = adjusted_p(params.p, etc) * taw
        if day < start or kc is None:
            out.append(DayBalance(day, day >= today, stage, kc, et0, etc, rain, 0.0, 0.0, taw, raw))
            continue
        rain_in = 0.0 if rain < 0.2 * et0 else rain  # small showers evaporate (FAO-56)
        stored = min(rain_in, dr + etc)  # rain beyond field capacity percolates
        dr = min(taw, max(0.0, dr - rain_in + etc))
        out.append(DayBalance(day, day >= today, stage, kc, et0, etc, rain, stored, dr, taw, raw))
    return out


@dataclass
class Recommendation:
    kind: str  # "today" | "in_days" | "not_within_window" | "not_applicable"
    days: int | None = None
    net_mm: float | None = None


def recommend(balance: list[DayBalance], today: date, crop: str) -> Recommendation:
    """First day from today on which depletion reaches RAW (FAO-56: irrigate when Dr >= RAW)."""
    if crop == "rice_paddy":
        return Recommendation("not_applicable")  # paddy is kept flooded; not a root-zone balance
    previous = None
    for row in balance:
        if row.date < today:
            previous = row
            continue
        if row.kc is None:
            return Recommendation("not_applicable")
        if row.date == today and previous is not None and previous.depletion_mm >= previous.raw_mm:
            return Recommendation("today", 0, round(previous.depletion_mm, 1))
        if row.depletion_mm >= row.raw_mm:
            n = (row.date - today).days
            return Recommendation("today" if n == 0 else "in_days", n, round(row.depletion_mm, 1))
    return Recommendation("not_within_window")
