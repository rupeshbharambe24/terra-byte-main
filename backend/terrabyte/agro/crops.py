"""Crop keys shared by all agronomy reference files, name resolution and region mapping."""

from __future__ import annotations

import re

# The keys used in fao56_crops.json, fertilizer_rdf_maharashtra.json and
# crop_calendar_maharashtra.json. Names are translated in the frontend (agro:crops.*).
CROP_KEYS: tuple[str, ...] = (
    "cotton_bt",
    "soybean",
    "tur_pigeonpea",
    "chickpea_gram",
    "wheat",
    "rice_paddy",
    "jowar_sorghum",
    "bajra_pearl_millet",
    "maize",
    "sugarcane",
    "onion",
    "tomato",
    "potato",
    "okra_bhendi",
    "brinjal",
    "chilli",
    "groundnut",
    "grapes",
    "pomegranate",
    "banana",
)

# Free-text names (English, Hindi, Marathi, common spellings) -> crop key.
_ALIASES: dict[str, str] = {
    "cotton": "cotton_bt",
    "bt cotton": "cotton_bt",
    "kapus": "cotton_bt",
    "कापूस": "cotton_bt",
    "कपास": "cotton_bt",
    "soybean": "soybean",
    "soyabean": "soybean",
    "soya": "soybean",
    "सोयाबीन": "soybean",
    "tur": "tur_pigeonpea",
    "toor": "tur_pigeonpea",
    "arhar": "tur_pigeonpea",
    "pigeonpea": "tur_pigeonpea",
    "pigeon pea": "tur_pigeonpea",
    "तूर": "tur_pigeonpea",
    "अरहर": "tur_pigeonpea",
    "gram": "chickpea_gram",
    "chickpea": "chickpea_gram",
    "chana": "chickpea_gram",
    "harbhara": "chickpea_gram",
    "हरभरा": "chickpea_gram",
    "चना": "chickpea_gram",
    "wheat": "wheat",
    "gahu": "wheat",
    "गहू": "wheat",
    "गेहूं": "wheat",
    "rice": "rice_paddy",
    "paddy": "rice_paddy",
    "bhat": "rice_paddy",
    "भात": "rice_paddy",
    "धान": "rice_paddy",
    "jowar": "jowar_sorghum",
    "sorghum": "jowar_sorghum",
    "ज्वारी": "jowar_sorghum",
    "ज्वार": "jowar_sorghum",
    "bajra": "bajra_pearl_millet",
    "bajri": "bajra_pearl_millet",
    "pearl millet": "bajra_pearl_millet",
    "बाजरी": "bajra_pearl_millet",
    "बाजरा": "bajra_pearl_millet",
    "maize": "maize",
    "corn": "maize",
    "makka": "maize",
    "मका": "maize",
    "मक्का": "maize",
    "sugarcane": "sugarcane",
    "ऊस": "sugarcane",
    "गन्ना": "sugarcane",
    "onion": "onion",
    "kanda": "onion",
    "कांदा": "onion",
    "प्याज": "onion",
    "tomato": "tomato",
    "टोमॅटो": "tomato",
    "टमाटर": "tomato",
    "potato": "potato",
    "batata": "potato",
    "बटाटा": "potato",
    "आलू": "potato",
    "okra": "okra_bhendi",
    "bhendi": "okra_bhendi",
    "bhindi": "okra_bhendi",
    "lady finger": "okra_bhendi",
    "भेंडी": "okra_bhendi",
    "भिंडी": "okra_bhendi",
    "brinjal": "brinjal",
    "eggplant": "brinjal",
    "vangi": "brinjal",
    "वांगी": "brinjal",
    "बैंगन": "brinjal",
    "chilli": "chilli",
    "chili": "chilli",
    "mirchi": "chilli",
    "मिरची": "chilli",
    "मिर्च": "chilli",
    "groundnut": "groundnut",
    "peanut": "groundnut",
    "bhuimug": "groundnut",
    "भुईमूग": "groundnut",
    "मूंगफली": "groundnut",
    "grape": "grapes",
    "grapes": "grapes",
    "draksh": "grapes",
    "द्राक्ष": "grapes",
    "अंगूर": "grapes",
    "pomegranate": "pomegranate",
    "dalimb": "pomegranate",
    "डाळिंब": "pomegranate",
    "अनार": "pomegranate",
    "banana": "banana",
    "keli": "banana",
    "केळी": "banana",
    "केला": "banana",
}


def resolve_crop(text: str | None) -> str | None:
    """Crop key for a stored crop value (a key or a common name), or None if unknown."""
    if not text:
        return None
    value = " ".join(text.strip().lower().replace("_", " ").split())
    key = value.replace(" ", "_")
    if key in CROP_KEYS:
        return key
    if value in _ALIASES:
        return _ALIASES[value]
    # "Onion (Rabi)", "Bt cotton hybrid" ...: first alias found as a whole word.
    for alias, crop in _ALIASES.items():
        if re.search(rf"(^|\W){re.escape(alias)}($|\W)", value):
            return crop
    return None


# MSP rows (msp.json ``crop``) that apply to each crop key. Crops not listed have no MSP.
MSP_CROPS: dict[str, tuple[str, ...]] = {
    "cotton_bt": ("Cotton (Medium Staple)", "Cotton (Long Staple)"),
    "soybean": ("Soybean (Yellow)",),
    "tur_pigeonpea": ("Tur / Arhar",),
    "chickpea_gram": ("Gram",),
    "wheat": ("Wheat",),
    "rice_paddy": ("Paddy (Common)", "Paddy (Grade A)"),
    "jowar_sorghum": ("Jowar (Hybrid)", "Jowar (Maldandi)"),
    "bajra_pearl_millet": ("Bajra",),
    "maize": ("Maize",),
    "groundnut": ("Groundnut",),
}

# Maharashtra regions by revenue division (Konkan; Pune = Western; Nashik = North;
# Chhatrapati Sambhajinagar = Marathwada; Amravati + Nagpur = Vidarbha).
REGIONS: dict[str, tuple[str, ...]] = {
    "vidarbha": (
        "Akola",
        "Amravati",
        "Bhandara",
        "Buldhana",
        "Chandrapur",
        "Gadchiroli",
        "Gondia",
        "Nagpur",
        "Wardha",
        "Washim",
        "Yavatmal",
    ),
    "marathwada": (
        "Beed",
        "Chhatrapati Sambhajinagar",
        "Dharashiv",
        "Hingoli",
        "Jalna",
        "Latur",
        "Nanded",
        "Parbhani",
    ),
    "western_maharashtra": ("Kolhapur", "Pune", "Sangli", "Satara", "Solapur"),
    "north_maharashtra": ("Ahilyanagar", "Dhule", "Jalgaon", "Nandurbar", "Nashik"),
    "konkan": (
        "Mumbai City",
        "Mumbai Suburban",
        "Palghar",
        "Raigad",
        "Ratnagiri",
        "Sindhudurg",
        "Thane",
    ),
}

_FORMER_NAMES = {
    "ahmednagar": "Ahilyanagar",
    "ahmadnagar": "Ahilyanagar",
    "aurangabad": "Chhatrapati Sambhajinagar",
    "osmanabad": "Dharashiv",
}


def canonical_district(district: str | None) -> str | None:
    if not district:
        return None
    name = " ".join(district.strip().split())
    if name.lower() in _FORMER_NAMES:
        return _FORMER_NAMES[name.lower()]
    for names in REGIONS.values():
        for d in names:
            if d.lower() == name.lower():
                return d
    return None


def region_of(district: str | None) -> str | None:
    """Region key for a Maharashtra district (current or former name), else None."""
    canonical = canonical_district(district)
    if canonical is None:
        return None
    for region, names in REGIONS.items():
        if canonical in names:
            return region
    return None  # pragma: no cover - every canonical district is in a region
