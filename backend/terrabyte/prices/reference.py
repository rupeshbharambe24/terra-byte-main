"""MSP lookup (from ``reference/msp.json``, PIB releases) and crop-name -> Agmarknet commodity."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

REFERENCE_DIR = Path(__file__).resolve().parent.parent / "reference"

# Agmarknet commodity name -> MSP crop names in msp.json. Commodities not listed have no MSP.
COMMODITY_MSP = {
    "Soyabean": ["Soybean (Yellow)"],
    "Cotton": ["Cotton (Medium Staple)", "Cotton (Long Staple)"],
    "Arhar (Tur/Red Gram)(Whole)": ["Tur / Arhar"],
    "Wheat": ["Wheat"],
    "Paddy(Dhan)(Common)": ["Paddy (Common)", "Paddy (Grade A)"],
    "Maize": ["Maize"],
    "Jowar(Sorghum)": ["Jowar (Hybrid)", "Jowar (Maldandi)"],
    "Bajra(Pearl Millet/Cumbu)": ["Bajra"],
    "Bengal Gram(Gram)(Whole)": ["Gram"],
    "Green Gram (Moong)(Whole)": ["Moong"],
    "Black Gram (Urd Beans)(Whole)": ["Urad"],
    "Groundnut": ["Groundnut"],
    "Sunflower": ["Sunflower Seed"],
    "Mustard": ["Rapeseed & Mustard"],
    "Safflower": ["Safflower"],
    "Ragi (Finger Millet)": ["Ragi"],
    "Sesamum(Sesame,Gingelly,Til)": ["Sesamum"],
    "Lentil (Masur)(Whole)": ["Lentil (Masur)"],
}

# Farmer-entered crop names (fields.current_crop, any case) -> Agmarknet commodity.
CROP_TO_COMMODITY = {
    "onion": "Onion",
    "tomato": "Tomato",
    "potato": "Potato",
    "okra": "Bhindi(Ladies Finger)",
    "bhindi": "Bhindi(Ladies Finger)",
    "bhendi": "Bhindi(Ladies Finger)",
    "soybean": "Soyabean",
    "soyabean": "Soyabean",
    "cotton": "Cotton",
    "tur": "Arhar (Tur/Red Gram)(Whole)",
    "arhar": "Arhar (Tur/Red Gram)(Whole)",
    "pigeonpea": "Arhar (Tur/Red Gram)(Whole)",
    "pigeon pea": "Arhar (Tur/Red Gram)(Whole)",
    "wheat": "Wheat",
    "rice": "Paddy(Dhan)(Common)",
    "paddy": "Paddy(Dhan)(Common)",
    "maize": "Maize",
    "corn": "Maize",
    "jowar": "Jowar(Sorghum)",
    "sorghum": "Jowar(Sorghum)",
    "bajra": "Bajra(Pearl Millet/Cumbu)",
    "gram": "Bengal Gram(Gram)(Whole)",
    "chickpea": "Bengal Gram(Gram)(Whole)",
    "groundnut": "Groundnut",
    "grape": "Grapes",
    "grapes": "Grapes",
    "pomegranate": "Pomegranate",
    "banana": "Banana",
    "brinjal": "Brinjal",
    "chilli": "Green Chilli",
    "green chilli": "Green Chilli",
    "cabbage": "Cabbage",
    "cauliflower": "Cauliflower",
    "sugarcane": "Sugarcane",
}


def commodity_for_crop(crop: str | None) -> str | None:
    if not crop:
        return None
    key = " ".join(crop.lower().split())
    return CROP_TO_COMMODITY.get(key)


@lru_cache
def _msp_data() -> dict:
    return json.loads((REFERENCE_DIR / "msp.json").read_text(encoding="utf-8"))


def msp_for_commodity(commodity: str) -> list[dict]:
    """Latest announced MSP row for each MSP crop matching the commodity (newest year first)."""
    crops = COMMODITY_MSP.get(commodity, [])
    rows = [r for r in _msp_data()["msp"] if r["crop"] in crops]
    latest: dict[str, dict] = {}
    for r in sorted(rows, key=lambda r: r["marketing_year"], reverse=True):
        latest.setdefault(r["crop"], r)
    return list(latest.values())


def msp_meta() -> dict:
    return _msp_data()["meta"]
