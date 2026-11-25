"""Curated disease information (``reference/disease_treatments.json``), banned-pesticide guard."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

TREATMENTS_FILE = Path(__file__).resolve().parent.parent / "reference" / "disease_treatments.json"


@lru_cache
def treatments() -> dict:
    return json.loads(TREATMENTS_FILE.read_text(encoding="utf-8"))


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def banned_in(active_ingredient: str, banned: list[str]) -> list[str]:
    """Banned names that appear (as whole words) in an active-ingredient string."""
    ai = f" {_norm(active_ingredient)} "
    return [b for b in banned if f" {_norm(b)} " in ai]


def info_for(class_id: str, include_chemical: bool) -> dict | None:
    """Disease info for a class; chemical options only when asked and never banned ones."""
    data = treatments()
    entry = data["classes"].get(class_id)
    if entry is None:
        return None
    banned = data["banned_active_ingredients"]
    chemical = [
        c for c in entry.get("chemical", []) if not banned_in(c["active_ingredient"], banned)
    ]
    out = {k: v for k, v in entry.items() if k != "chemical"}
    out["chemical"] = chemical if include_chemical else []
    out["chemical_withheld"] = bool(chemical) and not include_chemical
    out["chemical_note"] = (
        data["meta"]["chemical_disclaimer"] if out["chemical"] else data["meta"]["no_chemical_text"]
    )
    return out
