"""Glue between the pure agronomy modules, the database and the weather service."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from terrabyte.agro import fertilizer as fert
from terrabyte.agro import irrigation as irr
from terrabyte.agro.advisories import RULES_BY_ID, advisories
from terrabyte.agro.crops import MSP_CROPS, region_of, resolve_crop
from terrabyte.errors import ApiError
from terrabyte.models import Field, SoilTest, User
from terrabyte.reference import LAST_VERIFIED, load
from terrabyte.services import weather as wx
from terrabyte.timeutil import IST

ATTRIBUTION = {
    "text": wx.ATTRIBUTION,
    "url": wx.ATTRIBUTION_URL,
    "license": wx.LICENSE,
    "license_url": wx.LICENSE_URL,
}

# ---- Location + weather -------------------------------------------------------------------------


def location_for(user: User, field: Field | None, lat: float | None, lon: float | None) -> dict:
    if lat is not None and lon is not None:
        return {"lat": lat, "lon": lon, "source": "query", "field_id": None, "field_name": None}
    if field is not None and field.lat is not None and field.lon is not None:
        return {
            "lat": field.lat,
            "lon": field.lon,
            "source": "field",
            "field_id": field.id,
            "field_name": field.name,
        }
    if user.lat is not None and user.lon is not None:
        return {
            "lat": user.lat,
            "lon": user.lon,
            "source": "profile",
            "field_id": None,
            "field_name": None,
        }
    raise ApiError(
        422,
        "no_location",
        "Add your farm's location in Settings (profile or a field) to see weather.",
    )


def get_forecast(service: wx.WeatherService, lat: float, lon: float) -> wx.Forecast:
    try:
        return service.forecast(lat, lon)
    except wx.WeatherUnavailable as exc:
        raise ApiError(503, "weather_unavailable", "Weather is unavailable right now.") from exc


def weather_payload(forecast: wx.Forecast, location: dict, now: datetime | None = None) -> dict:
    now = now or datetime.now(IST)
    past, future = wx.split_days(forecast, now.date())
    hours = wx.future_hours(forecast, now)
    found = advisories(hours, future)
    return {
        "location": {**location, "lat": forecast.lat, "lon": forecast.lon},
        "fetched_at": forecast.fetched_at,
        "stale": forecast.stale,
        "today": now.date(),
        "daily": future[:7],
        "past_daily": past,
        "hourly": hours[:48],
        "advisories": [
            {
                "id": a.id,
                "severity": a.severity,
                "values": a.values,
                "rule": RULES_BY_ID[a.id]["rule"],
                "basis": RULES_BY_ID[a.id]["basis"],
                "source_url": RULES_BY_ID[a.id]["source_url"],
            }
            for a in found
        ],
        "attribution": ATTRIBUTION,
    }


# ---- Irrigation ---------------------------------------------------------------------------------


def _soil(field: Field, texture: str | None, awc: float | None) -> dict:
    assumptions = []
    if awc is not None:
        return {"texture": texture, "awc_mm_per_m": awc, "entered": True, "assumptions": []}
    if texture is None:
        name = (field.soil_type or "").strip().lower()
        texture = irr.SOIL_TYPE_TEXTURE.get(name)
        if texture:
            assumptions.append("soil_texture_mapped")
        else:
            texture = "loam"
            assumptions.append("soil_default")
    return {
        "texture": texture,
        "awc_mm_per_m": irr.SOIL_AWC_MM_PER_M[texture],
        "entered": False,
        "assumptions": assumptions,
    }


def irrigation_for(
    service: wx.WeatherService,
    owner: User,
    field: Field,
    texture: str | None = None,
    awc: float | None = None,
    last_irrigated: date | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = now or datetime.now(IST)
    today = now.date()
    crop = resolve_crop(field.current_crop)
    base: dict[str, Any] = {
        "field_id": field.id,
        "field_name": field.name,
        "area_acres": field.area_acres,
        "crop": crop,
        "crop_text": field.current_crop,
        "sowing_date": field.sowing_date,
        "today": today,
        "sources": [
            {
                "name": load("fao56_crops.json")["meta"]["source"],
                "url": "https://www.fao.org/4/x0490e/x0490e00.htm",
            },
            irr.SOIL_AWC_SOURCE,
        ],
        "attribution": ATTRIBUTION,
    }
    if crop is None:
        return {**base, "status": "no_crop" if not field.current_crop else "unknown_crop"}
    params = irr.crop_params(crop, field.season)
    if params is None:
        return {**base, "status": "not_available"}
    if field.sowing_date is None:
        return {**base, "status": "no_sowing_date"}
    if field.sowing_date > today:
        return {**base, "status": "not_sown"}
    days_after = (today - field.sowing_date).days
    if days_after >= params.total_days:
        return {**base, "status": "season_over", "days_after_sowing": days_after}
    location = location_for(owner, field, None, None)
    forecast = get_forecast(service, location["lat"], location["lon"])
    soil = _soil(field, texture, awc)

    rows = [
        (date.fromisoformat(d["date"]), float(d["et0_mm"]), float(d["rain_mm"] or 0))
        for d in forecast.daily
        if d["et0_mm"] is not None
    ]
    if not rows:
        raise ApiError(503, "weather_unavailable", "Weather is unavailable right now.")
    window_start = rows[0][0]
    assumptions = list(soil["assumptions"])
    start = window_start
    if field.sowing_date > window_start:
        start = field.sowing_date
        assumptions.append("start_fc_sowing")
    if last_irrigated is not None:
        if last_irrigated > today:
            raise ApiError(
                422, "validation_error", "The last irrigation date cannot be in the future."
            )
        if last_irrigated + timedelta(days=1) > start:
            start = min(last_irrigated + timedelta(days=1), today)
            assumptions = [a for a in assumptions if a != "start_fc_sowing"]
            assumptions.append("start_fc_last_irrigation")
        else:
            assumptions.append("last_irrigation_before_window")
    if start == window_start:
        assumptions.append("start_fc_window")
    assumptions += [
        "runoff_zero",
        "small_rain_ignored",
        "kc_not_climate_adjusted",
        "fao_stage_lengths",
        "net_not_gross",
    ]

    balance = irr.water_balance(params, field.sowing_date, rows, today, soil["awc_mm_per_m"], start)
    rec = irr.recommend(balance, today, crop)
    stage, kc = irr.stage_and_kc(params, days_after)

    def totals(items: list[irr.DayBalance]) -> dict[str, float]:
        etc = sum(r.etc_mm for r in items)
        rain = sum(r.rain_mm for r in items)
        eff = sum(r.effective_rain_mm for r in items)
        return {
            "days": len(items),
            "et0_mm": round(sum(r.et0_mm for r in items), 1),
            "etc_mm": round(etc, 1),
            "rain_mm": round(rain, 1),
            "effective_rain_mm": round(eff, 1),
            "net_need_mm": round(max(0.0, etc - eff), 1),
        }

    past = [r for r in balance if r.date < today]
    future = [r for r in balance if r.date >= today]
    next_totals = totals(future)
    litres_per_acre = next_totals["net_need_mm"] * irr.LITRES_PER_MM_PER_ACRE
    rec_litres_acre = (rec.net_mm or 0) * irr.LITRES_PER_MM_PER_ACRE
    return {
        **base,
        "status": "ok",
        "location": location,
        "stale_weather": forecast.stale,
        "days_after_sowing": days_after,
        "stage": stage,
        "kc": round(kc, 3) if kc is not None else None,
        "params": {
            "fao56_name": params.fao56_name,
            "is_proxy": params.is_proxy,
            "kc_ini": params.kc_ini,
            "kc_mid": params.kc_mid,
            "kc_end": params.kc_end,
            "stages_days": list(params.stages),
            "stage_region": params.stage_region,
            "root_depth_max_m": params.zr_max_m,
            "p_table": params.p,
            "notes": params.notes,
        },
        "soil": {k: v for k, v in soil.items() if k != "assumptions"},
        "balance_start": start,
        "days": [
            {
                "date": r.date,
                "forecast": r.is_forecast,
                "stage": r.stage,
                "kc": round(r.kc, 3) if r.kc is not None else None,
                "et0_mm": round(r.et0_mm, 2),
                "etc_mm": round(r.etc_mm, 2),
                "rain_mm": round(r.rain_mm, 1),
                "effective_rain_mm": round(r.effective_rain_mm, 1),
                "depletion_mm": round(r.depletion_mm, 1),
                "raw_mm": round(r.raw_mm, 1),
                "taw_mm": round(r.taw_mm, 1),
            }
            for r in balance
        ],
        "past": totals(past),
        "next": {
            **next_totals,
            "litres_per_acre": round(litres_per_acre),
            "litres_field": round(litres_per_acre * field.area_acres),
        },
        "recommendation": {
            "kind": rec.kind,
            "days": rec.days,
            "net_mm": rec.net_mm,
            "litres_per_acre": round(rec_litres_acre) if rec.net_mm is not None else None,
            "litres_field": round(rec_litres_acre * field.area_acres)
            if rec.net_mm is not None
            else None,
        },
        "assumptions": assumptions,
    }


# ---- Fertilizer ---------------------------------------------------------------------------------


def option_out(o: fert.RDFOption) -> dict[str, Any]:
    return {
        "id": o.id,
        "crop": o.crop,
        "season": o.season,
        "condition": o.condition,
        "variety_type": o.variety_type,
        "status": o.status,
        "usable": o.usable,
        "reason": o.reason,
        "n_kg_ha": o.n,
        "p2o5_kg_ha": o.p2o5,
        "k2o_kg_ha": o.k2o,
        "fym_t_ha": o.fym_t_ha,
        "notes": o.notes,
        "has_split": bool(o.split_schedule),
        "source_name": o.source_name,
        "source_url": o.source_url,
        "source_locator": o.source_locator,
    }


def _ratings(test: SoilTest | None, scheme: fert.Scheme) -> list[dict[str, Any]]:
    if test is None:
        return []
    rows = []
    entries = [
        ("N", test.n_kg_ha, "N", test.n_kg_ha),
        (
            "P",
            test.p_kg_ha,
            test.p_basis,
            None
            if test.p_kg_ha is None
            else (fert.p2o5_to_p(test.p_kg_ha) if test.p_basis == "P2O5" else test.p_kg_ha),
        ),
        (
            "K",
            test.k_kg_ha,
            test.k_basis,
            None
            if test.k_kg_ha is None
            else (fert.k2o_to_k(test.k_kg_ha) if test.k_basis == "K2O" else test.k_kg_ha),
        ),
        ("OC", test.oc_pct, "%", test.oc_pct),
    ]
    for nutrient, entered, basis, value in entries:
        if value is None:
            rows.append(
                {
                    "nutrient": nutrient,
                    "entered": None,
                    "basis": basis,
                    "value": None,
                    "class": None,
                    "factor": None,
                }
            )
            continue
        cls = fert.rate(value, nutrient, scheme)  # type: ignore[arg-type]
        rows.append(
            {
                "nutrient": nutrient,
                "entered": entered,
                "basis": basis,
                "value": round(value, 2),
                "class": cls,
                "factor": fert.adjustment_factor(cls, scheme) if nutrient != "OC" else None,
            }
        )
    return rows


def dose_for(
    crop: str,
    option: fert.RDFOption,
    area_acres: float | None,
    test: SoilTest | None,
    scheme: fert.Scheme,
    carrier: str,
) -> dict[str, Any]:
    ratings = _ratings(test, scheme)
    factors = {r["nutrient"]: r["factor"] for r in ratings if r["factor"] is not None}
    if option.n is None or option.p2o5 is None or option.k2o is None:
        raise ApiError(
            422, "rdf_not_usable", "This recommendation cannot be used for a calculation."
        )
    n = option.n * factors.get("N", 1.0)
    p2o5 = option.p2o5 * factors.get("P", 1.0)
    k2o = option.k2o * factors.get("K", 1.0)
    notes = []
    if test is None:
        notes.append("no_soil_test")
    elif len(factors) < 3:
        notes.append("missing_nutrients")
    area_ha = fert.acres_to_ha(area_acres) if area_acres else None
    plan = fert.solve_products(n, p2o5, k2o, carrier)
    prods = fert.products()

    def scale(kg_ha: float) -> dict[str, float | None]:
        return {
            "per_ha": round(kg_ha, 1),
            "per_acre": round(fert.per_ha_to_per_acre(kg_ha), 1),
            "per_field": round(kg_ha * area_ha, 1) if area_ha else None,
        }

    items = []
    for item in plan.items:
        p = prods[item.key]
        field_kg = item.kg * area_ha if area_ha else None
        acre_kg = fert.per_ha_to_per_acre(item.kg)
        items.append(
            {
                "key": item.key,
                "name": p.name,
                "grade": p.grade,
                "kg": scale(item.kg),
                "bag_kg": p.bag_kg,
                "bags_per_acre": fert.bags(acre_kg, p.bag_kg),
                "bags_field": fert.bags(field_kg, p.bag_kg) if field_kg is not None else None,
                "cost_per_acre_inr": fert.cost_inr(acre_kg, p),
                "cost_field_inr": fert.cost_inr(field_kg, p) if field_kg is not None else None,
                "price_inr_per_bag": p.price_inr_per_bag,
                "price_source": p.price_source,
                "price_source_url": p.price_source_url,
                "price_as_of": p.price_as_of,
                "s_pct": p.s_pct,
            }
        )
    splits = []
    for row in fert.split_plan(option.split_schedule, plan, n, p2o5, k2o):
        splits.append(
            {
                "timing": row["timing"],
                "text": row["text"],
                "n": scale(row["n_kg"]),
                "p2o5": scale(row["p2o5_kg"]),
                "k2o": scale(row["k2o_kg"]),
                "products": {k: scale(v) for k, v in row["products_kg"].items()},
            }
        )
    micro = []
    if test is not None:
        micro = fert.micronutrient_flags(
            {
                "Zn": test.zn_ppm,
                "Fe": test.fe_ppm,
                "Mn": test.mn_ppm,
                "Cu": test.cu_ppm,
                "B": test.b_ppm,
                "S": test.s_ppm,
            }
        )
    products_meta = load("fertilizer_products.json")["products"][0]
    return {
        "crop": crop,
        "rdf": option_out(option),
        "scheme": scheme,
        "carrier": carrier,
        "area_acres": area_acres,
        "soil_test_id": test.id if test else None,
        "soil_test_date": test.test_date if test else None,
        "ratings": ratings,
        "dose": {"n": scale(n), "p2o5": scale(p2o5), "k2o": scale(k2o)},
        "products": items,
        "excess": {k: scale(v) for k, v in plan.excess.items()},
        "splits": splits,
        "micronutrients": micro,
        "notes": notes,
        "sources": [
            {
                "name": option.source_name,
                "url": option.source_url,
                "locator": option.source_locator,
            },
            *fert.rating_sources(scheme),
            {
                "name": products_meta["source_name"],
                "url": products_meta["source_url"],
                "locator": None,
            },
        ],
        "last_verified": LAST_VERIFIED,
    }


# ---- Crop calendar + MSP ------------------------------------------------------------------------


def latest_msp(crop: str) -> list[dict[str, Any]]:
    names = MSP_CROPS.get(crop, ())
    data = load("msp.json")
    out = []
    for name in names:
        rows = [r for r in data["msp"] if r["crop"] == name]
        if rows:
            out.append(max(rows, key=lambda r: r["marketing_year"]))
    if crop == "sugarcane":
        frp = max(
            data["sugarcane_frp"], key=lambda r: r["applies_from"] if r.get("applies_from") else ""
        )
        out.append(
            {
                "crop": "Sugarcane (FRP)",
                "crop_hi": frp["crop_hi"],
                "crop_mr": frp["crop_mr"],
                "season": frp["price_type"],
                "marketing_year": frp["sugar_season"],
                "msp_inr_per_quintal": frp["frp_inr_per_quintal"],
                "source_url": frp["source_url"],
                "announced_on": frp["announced_on"],
            }
        )
    return out


def _season_group(window: dict | None) -> str:
    if not window or not window.get("start"):
        return "other"
    month = int(window["start"][:2])
    if 5 <= month <= 9:
        return "kharif"
    if 10 <= month <= 12:
        return "rabi"
    return "summer"


def calendar_for(district: str | None) -> dict[str, Any]:
    region = region_of(district)
    data = load("crop_calendar_maharashtra.json")
    district_slug = (district or "").strip().lower().replace(" ", "_")
    sources = {s["key"]: s for s in data["meta"]["sources"]}
    items = []
    for row in data["crops"]:
        entries = []
        for key, entry in row["regions"].items():
            if key.startswith("all") or key.startswith("maharashtra"):
                scope, rank = "state", 2
            elif region and key == region:
                scope, rank = "region", 1
            elif region and key.startswith(region + "_"):
                suffix = key[len(region) + 1 :]
                scope, rank = ("district", 0) if suffix == district_slug else ("region", 1)
            else:
                continue  # another region or one of its districts
            entries.append(
                {
                    "key": key,
                    "scope": scope,
                    "rank": rank,
                    "sowing_window": entry.get("sowing_window"),
                    "duration_days": entry.get("duration_days"),
                    "seed_rate_kg_ha": entry.get("seed_rate_kg_ha"),
                    "seed_rate_text": entry.get("seed_rate_text"),
                    "spacing_cm": entry.get("spacing_cm"),
                    "irrigated_or_rainfed": entry.get("irrigated_or_rainfed"),
                    "sowing_trigger": entry.get("sowing_trigger"),
                    "source_name": entry.get("source_name"),
                    "source_url": entry.get("source_url"),
                    "source_page": entry.get("source_page"),
                }
            )
        if not entries:
            continue
        # District first, then region, then state-wide; entries with a sowing window first.
        entries.sort(key=lambda e: (e["sowing_window"] is None, e["rank"]))
        best = entries[0]
        items.append(
            {
                "crop": row["crop"],
                "season": row["season"],
                "season_group": _season_group(best["sowing_window"]),
                "entries": entries,
                "notes": row.get("notes"),
                "irrigation_supported": irr.crop_params(row["crop"], row["season"]) is not None,
                "msp": latest_msp(row["crop"]),
            }
        )
    return {
        "district": district,
        "region": region,
        "items": items,
        "caveats": data["meta"]["caveats"],
        "source_keys": list(sources),
        "last_verified": LAST_VERIFIED,
    }
