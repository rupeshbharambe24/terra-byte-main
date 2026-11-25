"""Soil-test ratings and fertilizer doses (pure functions; no database, no I/O except the
bundled reference JSON).

Method (see ``reference/README_agronomy.md``):

1. Rate each nutrient of the soil test with the MPKV Rahuri 6-class table (Krishi Darshani 2026,
   the Maharashtra default) or the national 3-class table (Methods Manual 2011).
2. Take the crop's recommended dose (RDF, kg/ha N, P2O5, K2O) from the state agricultural
   university package of practices and multiply each nutrient by the factor for its class
   (MPKV: very low x1.5, low x1.25, medium/moderately high x1, high x0.75, very high x0.5;
   national: SHC school manual 2023, low x1.25, medium x1, high x0.75).
3. Convert nutrients to products: all P2O5 from the chosen phosphorus carrier (DAP by default,
   or SSP / a complex grade), then K2O still needed from MOP, then N still needed from urea.
4. Split the products over the application times printed with the RDF.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Literal

from terrabyte.reference import load

# ---- Unit conversions ---------------------------------------------------------------------------

# Molar-mass ratios: P2O5 / (2 P) = 141.94 / 61.95 and K2O / (2 K) = 94.20 / 78.20.
P_TO_P2O5 = 2.2914
K_TO_K2O = 1.2046
# 1 hectare = 2.4711 acres.
ACRES_PER_HA = 2.4711


def p_to_p2o5(p: float) -> float:
    return p * P_TO_P2O5


def p2o5_to_p(p2o5: float) -> float:
    return p2o5 / P_TO_P2O5


def k_to_k2o(k: float) -> float:
    return k * K_TO_K2O


def k2o_to_k(k2o: float) -> float:
    return k2o / K_TO_K2O


def per_ha_to_per_acre(value: float) -> float:
    return value / ACRES_PER_HA


def per_acre_to_per_ha(value: float) -> float:
    return value * ACRES_PER_HA


def acres_to_ha(acres: float) -> float:
    return acres / ACRES_PER_HA


# ---- Ratings ------------------------------------------------------------------------------------

Scheme = Literal["mpkv", "national"]
Nutrient = Literal["N", "P", "K", "OC"]

# Upper limit (inclusive) of each class, in class order. Units: N, P, K kg/ha as elemental P and
# K; OC %. The MPKV table prints integer ranges with gaps (e.g. N "<140", "141-280"); a value
# belongs to the first class whose upper limit it does not exceed.
_MPKV_CLASSES = ("very_low", "low", "medium", "moderately_high", "high", "very_high")
_MPKV_UPPER: dict[str, tuple[float, ...]] = {
    "N": (140, 280, 420, 560, 700),
    "P": (7, 14, 21, 28, 35),
    "K": (100, 150, 200, 250, 300),
    "OC": (0.20, 0.40, 0.60, 0.80, 1.0),
}
_MPKV_FACTOR = {
    "very_low": 1.5,
    "low": 1.25,
    "medium": 1.0,
    "moderately_high": 1.0,
    "high": 0.75,
    "very_high": 0.5,
}

# National: "low" is below the first limit, "medium" up to and including the second.
_NATIONAL_CLASSES = ("low", "medium", "high")
_NATIONAL_LIMITS: dict[str, tuple[float, float]] = {
    "N": (280, 560),
    "P": (10, 24.6),
    "K": (108, 280),
    "OC": (0.5, 0.75),
}
_NATIONAL_FACTOR = {"low": 1.25, "medium": 1.0, "high": 0.75}


def rate(value: float, nutrient: Nutrient, scheme: Scheme = "mpkv") -> str:
    """Soil-test class of one nutrient. P and K must be elemental kg/ha (not P2O5/K2O)."""
    if value < 0 or math.isnan(value):
        raise ValueError("Soil-test values cannot be negative")
    if scheme == "mpkv":
        for cls, upper in zip(_MPKV_CLASSES, _MPKV_UPPER[nutrient], strict=False):
            if value <= upper:
                return cls
        return "very_high"
    low, high = _NATIONAL_LIMITS[nutrient]
    if value < low:
        return "low"
    if value <= high:
        return "medium"
    return "high"


def adjustment_factor(cls: str, scheme: Scheme = "mpkv") -> float:
    table = _MPKV_FACTOR if scheme == "mpkv" else _NATIONAL_FACTOR
    return table[cls]


def rating_sources(scheme: Scheme) -> list[dict[str, str]]:
    data = load("soil_test_ratings.json")
    if scheme == "mpkv":
        table = data["maharashtra_6class"][0]
        return [
            {
                "name": table["source_name"],
                "url": table["source_url"],
                "locator": table["source_locator"],
            }
        ]
    national = data["national_3class"]
    school = data["shc_school_manual_2023"]
    return [
        {
            "name": national["source_name"],
            "url": national["source_url"],
            "locator": national["source_locator"],
        },
        {
            "name": school["source_name"] + " (dose adjustment rule)",
            "url": school["source_url"],
            "locator": school["adjustment_rule"]["source_locator"],
        },
    ]


# Micronutrient critical limits (mg/kg = ppm), MPKV Krishi Darshani 2026 PDF p42; sulphur from
# the SHC school manual 2023 (10 ppm, 0.15% CaCl2 extract).
def micronutrient_limits() -> dict[str, dict[str, Any]]:
    data = load("soil_test_ratings.json")
    mpkv = data["micronutrient_critical_limits"][0]
    school = data["micronutrient_critical_limits"][2]
    limits = {
        k: {"limit": float(v), "source": mpkv["source_name"], "url": mpkv["source_url"]}
        for k, v in mpkv["values"].items()
        if k in ("Fe", "Mn", "Zn", "Cu", "B")
    }
    limits["S"] = {
        "limit": float(school["values"]["S"]),
        "source": school["source_name"],
        "url": school["source_url"],
    }
    return limits


def micronutrient_flags(values: dict[str, float | None]) -> list[dict[str, Any]]:
    """One row per entered micronutrient: deficient if below the critical limit."""
    rows = []
    for nutrient, info in micronutrient_limits().items():
        value = values.get(nutrient)
        if value is None:
            continue
        rows.append(
            {
                "nutrient": nutrient,
                "value_ppm": value,
                "critical_limit_ppm": info["limit"],
                "deficient": value < info["limit"],
                "source": info["source"],
                "source_url": info["url"],
            }
        )
    return rows


# ---- Recommended doses (RDF) --------------------------------------------------------------------


@dataclass
class RDFOption:
    id: int
    crop: str
    season: str | None
    condition: str | None
    variety_type: str | None
    status: str
    usable: bool
    reason: str | None
    n: float | None
    p2o5: float | None
    k2o: float | None
    notes: list[str]
    split_schedule: list[dict[str, Any]]
    fym_t_ha: float | None
    source_name: str
    source_url: str | None
    source_locator: str | None
    as_given: dict[str, Any] | None


def _dose(value: Any, label: str, notes: list[str]) -> float | None:
    if value is None:
        notes.append(f"{label}: not stated by the source; taken as 0.")
        return 0.0
    if isinstance(value, list):
        low, high = value
        notes.append(
            f"{label}: the source gives a range {low}-{high} kg/ha; the lower value is used."
        )
        return float(low)
    return float(value)


def rdf_options(crop: str) -> list[RDFOption]:
    """Every RDF entry for the crop. Only per-hectare entries with numbers and without a
    conflict flag are usable for a calculation; the others are listed with the reason."""
    out = []
    for idx, row in enumerate(load("fertilizer_rdf_maharashtra.json")["crops"]):
        if row["crop"] != crop:
            continue
        notes: list[str] = []
        reason = None
        n = p = k = None
        if row["status"] == "conflict_flagged":
            reason = "conflict_flagged"
        elif row.get("basis") != "per_ha":
            reason = "per_plant"
        elif row.get("N_kg_ha") is None:
            reason = "no_numbers"
        else:
            n = _dose(row.get("N_kg_ha"), "N", notes)
            p = _dose(row.get("P2O5_kg_ha"), "P2O5", notes)
            k = _dose(row.get("K2O_kg_ha"), "K2O", notes)
        if row.get("derived_fields"):
            notes.append(
                "The source prints the dose per acre; per-hectare values were derived (x2.471)."
            )
        out.append(
            RDFOption(
                id=idx,
                crop=crop,
                season=row.get("season"),
                condition=row.get("condition"),
                variety_type=row.get("variety_type"),
                status=row["status"],
                usable=reason is None,
                reason=reason,
                n=n,
                p2o5=p,
                k2o=k,
                notes=notes,
                split_schedule=row.get("split_schedule") or [],
                fym_t_ha=row.get("FYM_t_ha")
                if isinstance(row.get("FYM_t_ha"), int | float)
                else None,
                source_name=row.get("source_name") or "",
                source_url=row.get("source_url"),
                source_locator=row.get("source_locator"),
                as_given=row.get("as_given"),
            )
        )
    return out


def season_matches(option_season: str | None, season: str | None) -> bool:
    """RDF seasons can be combined, e.g. "kharif|rabi|summer"."""
    if not option_season or not season:
        return False
    return season in option_season.split("|")


def rdf_option(crop: str, option_id: int | None, season: str | None = None) -> RDFOption | None:
    """The requested option, or the first usable one: same season first, then complete
    entries first."""
    options = rdf_options(crop)
    if option_id is not None:
        return next((o for o in options if o.id == option_id), None)
    usable = [o for o in options if o.usable]
    usable.sort(key=lambda o: (not season_matches(o.season, season), o.status != "complete"))
    return usable[0] if usable else None


# ---- Products -----------------------------------------------------------------------------------

PhosphorusCarrier = Literal["dap", "ssp", "npk_10_26_26", "npk_12_32_16", "aps_20_20_0_13"]
PHOSPHORUS_CARRIERS: dict[str, str] = {
    "dap": "18-46-0",
    "ssp": "0-16-0",
    "npk_10_26_26": "10-26-26",
    "npk_12_32_16": "12-32-16",
    "aps_20_20_0_13": "20-20-0-13",
}
UREA_GRADE = "46-0-0"
MOP_GRADE = "0-0-60"


@dataclass
class Product:
    key: str
    name: str
    grade: str
    n_pct: float
    p2o5_pct: float
    k2o_pct: float
    s_pct: float | None
    bag_kg: float | None
    price_inr_per_bag: float | None
    price_source: str | None
    price_source_url: str | None
    price_as_of: str | None


def products() -> dict[str, Product]:
    data = load("fertilizer_products.json")
    by_grade = {p["grade"]: p for p in data["products"] if p.get("grade")}
    prices = {p["product"]: p for p in data["prices"]}
    keys = {"urea": UREA_GRADE, "mop": MOP_GRADE, **PHOSPHORUS_CARRIERS}
    out = {}
    for key, grade in keys.items():
        p = by_grade[grade]
        price = None
        if key == "urea":
            price = prices.get("Urea (neem coated)")
        elif key == "dap":
            price = prices.get("DAP")
        out[key] = Product(
            key=key,
            name=p["product"],
            grade=grade,
            n_pct=float(p["N_pct"]),
            p2o5_pct=float(p["P2O5_pct"]),
            k2o_pct=float(p["K2O_pct"]),
            s_pct=float(p["S_pct"]) if p.get("S_pct") is not None else None,
            bag_kg=float(price["bag_kg"]) if price else None,
            price_inr_per_bag=float(price["mrp_inr_per_bag"]) if price else None,
            price_source=(price.get("source_name") or price.get("source_type")) if price else None,
            price_source_url=price.get("source_url") if price else None,
            price_as_of=price.get("as_of") if price else None,
        )
    return out


@dataclass
class ProductQty:
    key: str
    kg: float
    n: float = 0.0
    p2o5: float = 0.0
    k2o: float = 0.0


@dataclass
class ProductPlan:
    carrier: str
    items: list[ProductQty]
    excess: dict[str, float] = field(default_factory=dict)


def solve_products(n: float, p2o5: float, k2o: float, carrier: str = "dap") -> ProductPlan:
    """Product quantities (kg, for the same area as the nutrient amounts).

    All P2O5 comes from the phosphorus carrier; K2O it does not supply comes from MOP; N it
    does not supply comes from urea. Nutrients supplied beyond the need (e.g. N from DAP when
    the crop needs little N) are reported in ``excess``.
    """
    if min(n, p2o5, k2o) < 0:
        raise ValueError("Nutrient amounts cannot be negative")
    if carrier not in PHOSPHORUS_CARRIERS:
        raise ValueError(f"Unknown phosphorus carrier {carrier}")
    prods = products()
    c = prods[carrier]
    carrier_kg = p2o5 / (c.p2o5_pct / 100) if p2o5 > 0 else 0.0
    c_n = carrier_kg * c.n_pct / 100
    c_k = carrier_kg * c.k2o_pct / 100
    mop_kg = max(0.0, k2o - c_k) / (prods["mop"].k2o_pct / 100)
    urea_kg = max(0.0, n - c_n) / (prods["urea"].n_pct / 100)
    items = [
        ProductQty(carrier, carrier_kg, n=c_n, p2o5=p2o5 if carrier_kg else 0.0, k2o=c_k),
        ProductQty("mop", mop_kg, k2o=max(0.0, k2o - c_k)),
        ProductQty("urea", urea_kg, n=max(0.0, n - c_n)),
    ]
    excess = {}
    if c_n > n + 1e-9:
        excess["N"] = c_n - n
    if c_k > k2o + 1e-9:
        excess["K2O"] = c_k - k2o
    return ProductPlan(carrier=carrier, items=items, excess=excess)


def bags(kg: float, bag_kg: float | None) -> float | None:
    """Number of bags (one decimal), or None when the bag size is not in the reference data."""
    if not bag_kg:
        return None
    return round(kg / bag_kg, 1)


def cost_inr(kg: float, product: Product) -> float | None:
    """Cost at the official/regulated price, or None when the company sets the price."""
    if product.price_inr_per_bag is None or not product.bag_kg:
        return None
    return round(kg * product.price_inr_per_bag / product.bag_kg, 0)


def split_plan(
    schedule: list[dict[str, Any]], plan: ProductPlan, n: float, p2o5: float, k2o: float
) -> list[dict[str, Any]]:
    """Nutrients and products per application time, using the percentages printed with the RDF.

    The P carrier follows the P2O5 share, MOP the K2O share; urea makes up the N of that split
    not already supplied by the carrier.
    """
    by_key = {i.key: i for i in plan.items}
    carrier = by_key[plan.carrier]
    rows = []
    for step in schedule:
        n_pct = float(step.get("N_pct") or 0)
        p_pct = float(step.get("P2O5_pct") or 0)
        k_pct = float(step.get("K2O_pct") or 0)
        carrier_kg = carrier.kg * p_pct / 100
        mop_kg = by_key["mop"].kg * k_pct / 100
        split_n = n * n_pct / 100
        urea_kg = max(0.0, split_n - carrier.n * p_pct / 100) / 0.46
        rows.append(
            {
                "timing": step.get("timing"),
                "text": step.get("text"),
                "n_kg": split_n,
                "p2o5_kg": p2o5 * p_pct / 100,
                "k2o_kg": k2o * k_pct / 100,
                "products_kg": {plan.carrier: carrier_kg, "mop": mop_kg, "urea": urea_kg},
            }
        )
    return rows
