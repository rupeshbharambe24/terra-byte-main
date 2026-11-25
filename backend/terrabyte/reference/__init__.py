"""Official reference data bundled with the API (read-only JSON files in this folder).

The files were compiled from official sources on 2026-11-24; every record carries its source URL.
See ``README_general.md`` (MSP, schemes, KVKs) and ``README_agronomy.md`` (soil ratings, fertilizer
doses, FAO-56 crop coefficients, crop calendar) for sources, caveats and known gaps.
"""

from __future__ import annotations

import json
from functools import cache
from pathlib import Path
from typing import Any

REFERENCE_DIR = Path(__file__).resolve().parent

FILES = (
    "msp.json",
    "schemes.json",
    "kvk_maharashtra.json",
    "soil_test_ratings.json",
    "fertilizer_rdf_maharashtra.json",
    "fertilizer_products.json",
    "fao56_crops.json",
    "crop_calendar_maharashtra.json",
)

# Date on which the bundled files were last checked against their sources.
LAST_VERIFIED = "2026-11-24"


@cache
def load(name: str) -> Any:
    """Parsed contents of one bundled reference file (cached; treat as read-only)."""
    if name not in FILES:
        raise KeyError(name)
    return json.loads((REFERENCE_DIR / name).read_text(encoding="utf-8"))


def load_all() -> None:
    """Parse every file once at startup so a broken file fails fast."""
    for name in FILES:
        load(name)
