"""Unit tests for the pure agronomy modules (no database, no network)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from terrabyte.agro import fertilizer as fert
from terrabyte.agro import irrigation as irr
from terrabyte.agro.advisories import advisories
from terrabyte.agro.crops import canonical_district, region_of, resolve_crop

# ---- Unit conversions ---------------------------------------------------------------------------


def test_p_and_k_oxide_conversions():
    assert fert.p_to_p2o5(10) == pytest.approx(22.914)
    assert fert.p2o5_to_p(22.914) == pytest.approx(10)
    assert fert.k_to_k2o(100) == pytest.approx(120.46)
    assert fert.k2o_to_k(120.46) == pytest.approx(100)
    # MPKV elemental limits match the 2011 Maharashtra P2O5/K2O table (<16, <120).
    assert fert.p_to_p2o5(7) == pytest.approx(16.0, abs=0.1)
    assert fert.k_to_k2o(100) == pytest.approx(120, abs=1)


def test_area_conversions():
    assert fert.per_acre_to_per_ha(50) == pytest.approx(123.555)
    assert fert.per_ha_to_per_acre(123.555) == pytest.approx(50)
    assert fert.acres_to_ha(2.4711) == pytest.approx(1)


# ---- Ratings ------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "nutrient", "expected"),
    [
        (100, "N", "very_low"),
        (140, "N", "very_low"),
        (140.5, "N", "low"),
        (280, "N", "low"),
        (300, "N", "medium"),
        (500, "N", "moderately_high"),
        (650, "N", "high"),
        (800, "N", "very_high"),
        (5, "P", "very_low"),
        (7.5, "P", "low"),
        (18, "P", "medium"),
        (40, "P", "very_high"),
        (90, "K", "very_low"),
        (175, "K", "medium"),
        (320, "K", "very_high"),
        (0.35, "OC", "low"),
    ],
)
def test_mpkv_rating(value, nutrient, expected):
    assert fert.rate(value, nutrient, "mpkv") == expected


@pytest.mark.parametrize(
    ("value", "nutrient", "expected"),
    [
        (279, "N", "low"),
        (280, "N", "medium"),
        (560, "N", "medium"),
        (561, "N", "high"),
        (9.9, "P", "low"),
        (24.6, "P", "medium"),
        (25, "P", "high"),
        (107, "K", "low"),
        (300, "K", "high"),
    ],
)
def test_national_rating(value, nutrient, expected):
    assert fert.rate(value, nutrient, "national") == expected


def test_adjustment_factors():
    assert fert.adjustment_factor("very_low") == 1.5
    assert fert.adjustment_factor("low") == 1.25
    assert fert.adjustment_factor("moderately_high") == 1.0
    assert fert.adjustment_factor("very_high") == 0.5
    assert fert.adjustment_factor("high", "national") == 0.75


def test_negative_soil_value_rejected():
    with pytest.raises(ValueError):
        fert.rate(-1, "N")


def test_micronutrient_flags_use_critical_limits():
    rows = {r["nutrient"]: r for r in fert.micronutrient_flags({"Zn": 0.4, "Fe": 6.0, "S": 8})}
    assert rows["Zn"]["deficient"] and rows["Zn"]["critical_limit_ppm"] == 0.6
    assert not rows["Fe"]["deficient"]
    assert rows["S"]["deficient"] and rows["S"]["critical_limit_ppm"] == 10
    assert "Mn" not in rows  # not entered -> no flag


# ---- RDF + products -----------------------------------------------------------------------------


def test_rdf_options_flag_unusable_entries():
    cotton = fert.rdf_options("cotton_bt")
    flagged = [o for o in cotton if o.status == "conflict_flagged"]
    assert flagged and not any(o.usable for o in flagged)
    pomegranate = fert.rdf_options("pomegranate")
    assert pomegranate and not any(o.usable for o in pomegranate)  # per-plant doses
    default = fert.rdf_option("wheat", None)
    assert default is not None and default.usable and default.status == "complete"


def test_default_rdf_prefers_the_field_season():
    rabi = fert.rdf_option("onion", None, "rabi")
    assert rabi is not None and rabi.season == "rabi"
    tomato = fert.rdf_option("tomato", None, "summer")
    assert tomato is not None and fert.season_matches(tomato.season, "summer")
    assert not fert.season_matches(None, "rabi")


def test_rdf_range_uses_lower_value_with_note():
    jowar = next(o for o in fert.rdf_options("jowar_sorghum") if o.season == "kharif")
    assert jowar.n == 60 and jowar.p2o5 == 30
    assert any("range" in n for n in jowar.notes)


def test_dap_first_then_mop_then_urea():
    plan = fert.solve_products(n=120, p2o5=60, k2o=40, carrier="dap")
    kg = {i.key: i.kg for i in plan.items}
    assert kg["dap"] == pytest.approx(60 / 0.46)  # 130.4 kg
    n_from_dap = kg["dap"] * 0.18
    assert kg["urea"] == pytest.approx((120 - n_from_dap) / 0.46)
    assert kg["mop"] == pytest.approx(40 / 0.60)
    assert plan.excess == {}


def test_ssp_alternative_supplies_no_nitrogen():
    plan = fert.solve_products(n=100, p2o5=48, k2o=0, carrier="ssp")
    kg = {i.key: i.kg for i in plan.items}
    assert kg["ssp"] == pytest.approx(300)
    assert kg["urea"] == pytest.approx(100 / 0.46)
    assert kg["mop"] == 0


def test_complex_grade_reports_excess():
    plan = fert.solve_products(n=10, p2o5=52, k2o=20, carrier="npk_10_26_26")
    kg = {i.key: i.kg for i in plan.items}
    assert kg["npk_10_26_26"] == pytest.approx(200)
    assert kg["urea"] == 0 and kg["mop"] == 0
    assert plan.excess["N"] == pytest.approx(10)
    assert plan.excess["K2O"] == pytest.approx(32)


def test_bags_and_official_prices():
    prods = fert.products()
    assert prods["urea"].bag_kg == 45 and prods["urea"].price_inr_per_bag == 242
    assert prods["dap"].bag_kg == 50 and prods["dap"].price_inr_per_bag == 1350
    assert prods["mop"].price_inr_per_bag is None  # company-set price
    assert fert.bags(90, 45) == 2.0
    assert fert.bags(90, None) is None
    assert fert.cost_inr(90, prods["urea"]) == 484
    assert fert.cost_inr(50, prods["mop"]) is None


def test_split_plan_follows_rdf_percentages():
    option = fert.rdf_option("cotton_bt", 0)
    assert option is not None and option.split_schedule
    plan = fert.solve_products(option.n, option.p2o5, option.k2o)
    rows = fert.split_plan(option.split_schedule, plan, option.n, option.p2o5, option.k2o)
    assert sum(r["n_kg"] for r in rows) == pytest.approx(option.n)
    assert rows[0]["p2o5_kg"] == pytest.approx(option.p2o5)  # full P at sowing
    assert sum(r["products_kg"]["dap"] for r in rows) == pytest.approx(plan.items[0].kg)


# ---- Irrigation ---------------------------------------------------------------------------------


def test_kc_curve_interpolates_per_fao56():
    wheat = irr.crop_params("wheat")
    assert wheat is not None and wheat.stages == (15, 25, 50, 30)
    assert irr.stage_and_kc(wheat, 0) == ("initial", 0.3)
    stage, kc = irr.stage_and_kc(wheat, 15 + 12)  # halfway-ish through development
    assert stage == "development"
    assert kc == pytest.approx(0.3 + 12 / 25 * (1.15 - 0.3))
    assert irr.stage_and_kc(wheat, 60) == ("mid", 1.15)
    end_kc = wheat.kc_end  # FAO range 0.25-0.4 -> midpoint
    assert end_kc == pytest.approx(0.325)
    stage, kc = irr.stage_and_kc(wheat, 90 + 15)
    assert stage == "late" and kc == pytest.approx(1.15 + 0.5 * (end_kc - 1.15))
    assert irr.stage_and_kc(wheat, 120) == ("harvested", None)
    assert irr.stage_and_kc(wheat, -1) == ("not_sown", None)


def test_crops_without_fao56_data_are_not_supported():
    for crop in ("tur_pigeonpea", "okra_bhendi", "pomegranate", "chickpea_gram", "grapes"):
        assert irr.crop_params(crop) is None
    chilli = irr.crop_params("chilli")
    assert chilli is not None and chilli.is_proxy


def test_p_adjustment_is_clamped():
    assert irr.adjusted_p(0.5, 5) == 0.5
    assert irr.adjusted_p(0.5, 10) == pytest.approx(0.3)
    assert irr.adjusted_p(0.1, 10) == 0.1
    assert irr.adjusted_p(0.8, 0) == 0.8


def test_water_balance_and_recommendation():
    onion = irr.crop_params("onion")
    assert onion is not None
    today = date(2026, 12, 20)
    sowing = date(2026, 11, 1)  # mid-season by mid December? initial 15 + dev 25 = 40 days
    days = [(today - timedelta(days=7) + timedelta(days=i), 5.0, 0.0) for i in range(14)]
    balance = irr.water_balance(onion, sowing, days, today, 160, days[0][0])
    # Depletion grows by ETc every dry day.
    assert balance[0].depletion_mm == pytest.approx(balance[0].etc_mm)
    assert balance[3].depletion_mm > balance[2].depletion_mm
    rec = irr.recommend(balance, today, "onion")
    assert rec.kind == "today"  # 7 dry days at ~5 mm/day exceed RAW of a shallow-rooted crop
    assert rec.net_mm and rec.net_mm > 0


def test_rain_refills_root_zone_and_small_rain_is_ignored():
    soy = irr.crop_params("soybean")
    assert soy is not None
    start = date(2026, 7, 1)
    days = [
        (start, 4.0, 0.0),
        (start + timedelta(days=1), 4.0, 0.5),  # < 0.2 x ET0 -> evaporates
        (start + timedelta(days=2), 4.0, 50.0),  # refills, rest percolates
    ]
    balance = irr.water_balance(soy, date(2026, 6, 1), days, start, 160, start)
    assert balance[1].effective_rain_mm == 0
    assert balance[2].depletion_mm == 0
    assert balance[2].effective_rain_mm == pytest.approx(
        balance[1].depletion_mm + balance[2].etc_mm
    )


def test_paddy_gets_no_balance_recommendation():
    assert irr.recommend([], date(2026, 8, 1), "rice_paddy").kind == "not_applicable"


# ---- Advisories ---------------------------------------------------------------------------------


def _hours(rain=0.0, wind=5.0, n=48):
    return [{"precipitation_mm": rain, "wind_kmh": wind} for _ in range(n)]


def test_advisory_rules():
    days = [{"date": "2026-11-25", "rain_mm": 0, "tmax_c": 30, "tmin_c": 15}] * 7
    ids = {a.id for a in advisories(_hours(rain=0.25), days)}
    assert ids == {"rain_48h", "dry_week"}  # 48 x 0.25 = 12 mm in 48 h
    ids = {a.id for a in advisories(_hours(wind=18), days)}
    assert "wind_spray" in ids and "rain_48h" not in ids
    hot = [{"date": "2026-04-20", "rain_mm": 70, "tmax_c": 41, "tmin_c": 3}]
    ids = {a.id for a in advisories(_hours(), hot)}
    assert {"heavy_rain", "heat", "cold"} <= ids
    assert advisories([], []) == []


# ---- Crops and regions --------------------------------------------------------------------------


def test_crop_names_resolve_to_keys():
    assert resolve_crop("Onion") == "onion"
    assert resolve_crop("grapes") == "grapes"
    assert resolve_crop("Grape") == "grapes"
    assert resolve_crop("Bt cotton hybrid") == "cotton_bt"
    assert resolve_crop("कांदा") == "onion"
    assert resolve_crop("turmeric") is None
    assert resolve_crop("") is None


def test_districts_map_to_regions():
    assert region_of("Pune") == "western_maharashtra"
    assert region_of("Nashik") == "north_maharashtra"
    assert region_of("Aurangabad") == "marathwada"
    assert canonical_district("osmanabad") == "Dharashiv"
    assert region_of("Nagpur") == "vidarbha"
    assert region_of("Ratnagiri") == "konkan"
    assert region_of("Bangalore") is None
