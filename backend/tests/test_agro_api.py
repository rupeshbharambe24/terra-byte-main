"""API tests for weather, irrigation, soil tests, fertilizer, crop calendar, schemes, MSP and
KVKs. Open-Meteo is replaced by an httpx.MockTransport: no test touches the network."""

from __future__ import annotations

import json
import time
from datetime import datetime, timedelta

import httpx
import pytest

from terrabyte.kvk_import import BUNDLED_FILE, default_state, import_bundled, import_kvks, load_rows
from terrabyte.models import KVK
from terrabyte.services.weather import WeatherService
from terrabyte.timeutil import IST


def fake_open_meteo(rain_today=0.0, wind=8.0, et0=5.0) -> dict:
    today = datetime.now(IST).date()
    days = [today + timedelta(days=i) for i in range(-7, 7)]
    hours = [
        datetime.combine(d, datetime.min.time()) + timedelta(hours=h)
        for d in days
        for h in range(24)
    ]
    return {
        "daily": {
            "time": [d.isoformat() for d in days],
            "weather_code": [1] * 14,
            "temperature_2m_max": [31.0] * 14,
            "temperature_2m_min": [14.0] * 14,
            "precipitation_sum": [rain_today if d == today else 0.0 for d in days],
            "precipitation_probability_max": [10] * 14,
            "et0_fao_evapotranspiration": [et0] * 14,
            "wind_speed_10m_max": [wind] * 14,
            "relative_humidity_2m_max": [80] * 14,
            "relative_humidity_2m_min": [35] * 14,
        },
        "hourly": {
            "time": [h.strftime("%Y-%m-%dT%H:%M") for h in hours],
            "temperature_2m": [25.0] * len(hours),
            "relative_humidity_2m": [50] * len(hours),
            "precipitation": [0.0] * len(hours),
            "precipitation_probability": [5] * len(hours),
            "wind_speed_10m": [wind] * len(hours),
            "weather_code": [1] * len(hours),
        },
    }


@pytest.fixture
def weather_calls(client):
    calls: list[httpx.Request] = []
    state = {"payload": fake_open_meteo(), "fail": False}

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if state["fail"]:
            raise httpx.ConnectTimeout("timeout", request=request)
        return httpx.Response(200, json=state["payload"])

    client.app.state.weather = WeatherService(transport=httpx.MockTransport(handler))
    return calls, state


@pytest.fixture
def farmer(make_actor):
    actor = make_actor("farmer")
    actor.patch("/api/me", {"lat": 19.1167, "lon": 73.9667})
    return actor


def _field(farmer, **kw):
    sow = (datetime.now(IST).date() - timedelta(days=40)).isoformat()
    payload = {
        "name": "Plot A",
        "area_acres": 2,
        "soil_type": "Medium black",
        "current_crop": "onion",
        "season": "rabi",
        "sowing_date": sow,
        **kw,
    }
    res = farmer.post("/api/fields", payload)
    assert res.status_code == 201, res.text
    return res.json()


# ---- Weather ------------------------------------------------------------------------------------


def test_weather_uses_profile_location_and_caches(farmer, weather_calls):
    calls, _ = weather_calls
    res = farmer.get("/api/weather")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["location"]["source"] == "profile"
    assert len(data["daily"]) == 7 and len(data["past_daily"]) == 7
    assert 0 < len(data["hourly"]) <= 48
    assert data["attribution"]["text"] == "Weather data by Open-Meteo.com"
    assert data["attribution"]["license"] == "CC BY 4.0"
    assert {a["id"] for a in data["advisories"]} == {"dry_week"}
    assert all(a["rule"] and a["basis"] for a in data["advisories"])
    params = calls[0].url.params
    assert params["latitude"] == "19.12" and params["past_days"] == "7"
    assert "et0_fao_evapotranspiration" in params["daily"]
    farmer.get("/api/weather")
    assert len(calls) == 1  # served from the 30-minute cache


def test_weather_wind_advisory_and_query_location(farmer, weather_calls):
    _, state = weather_calls
    state["payload"] = fake_open_meteo(wind=20)
    res = farmer.get("/api/weather", params={"lat": 20.0, "lon": 74.0})
    assert res.status_code == 200
    assert "wind_spray" in {a["id"] for a in res.json()["advisories"]}
    assert farmer.get("/api/weather", params={"lat": 20.0}).status_code == 422
    assert farmer.get("/api/weather", params={"lat": 50, "lon": 74}).status_code == 422


def test_weather_unavailable_and_stale_fallback(farmer, weather_calls):
    calls, state = weather_calls
    state["fail"] = True
    res = farmer.get("/api/weather")
    assert res.status_code == 503 and res.json()["code"] == "weather_unavailable"
    state["fail"] = False
    assert farmer.get("/api/weather").status_code == 200
    # Expire the cache entry, then fail: the stale copy is served and flagged.
    service = farmer.client.app.state.weather
    for key, (_, forecast) in list(service._cache.items()):
        service._cache[key] = (time.monotonic() - 3600, forecast)
    state["fail"] = True
    res = farmer.get("/api/weather")
    assert res.status_code == 200 and res.json()["stale"] is True


def test_weather_needs_a_location(make_actor, weather_calls):
    farmer = make_actor("farmer")
    res = farmer.get("/api/weather")
    assert res.status_code == 422 and res.json()["code"] == "no_location"


# ---- Irrigation ---------------------------------------------------------------------------------


def test_irrigation_for_field_with_crop(farmer, weather_calls):
    field = _field(farmer)
    res = farmer.get(f"/api/fields/{field['id']}/irrigation")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "ok" and data["crop"] == "onion"
    assert data["stage"] == "mid" and data["kc"] == 1.05  # day 40 of 15+25+70+40
    assert data["soil"]["texture"] == "silty_clay" and data["soil"]["awc_mm_per_m"] == 160
    assert "soil_texture_mapped" in data["assumptions"] and "start_fc_window" in data["assumptions"]
    assert len(data["days"]) == 14
    assert data["next"]["etc_mm"] == pytest.approx(7 * 5 * 1.05, abs=0.2)
    assert data["next"]["litres_field"] == pytest.approx(data["next"]["litres_per_acre"] * 2, abs=2)
    assert data["recommendation"]["kind"] in ("today", "in_days")
    assert data["attribution"]["text"].startswith("Weather data by Open-Meteo")


def test_irrigation_last_irrigated_and_soil_override(farmer, weather_calls):
    field = _field(farmer)
    yesterday = (datetime.now(IST).date() - timedelta(days=1)).isoformat()
    res = farmer.get(
        f"/api/fields/{field['id']}/irrigation",
        params={"last_irrigated": yesterday, "awc_mm_per_m": 200},
    )
    data = res.json()
    assert data["soil"]["entered"] is True
    assert "start_fc_last_irrigation" in data["assumptions"]
    assert data["recommendation"]["kind"] in ("in_days", "not_within_window", "today")
    future = (datetime.now(IST).date() + timedelta(days=2)).isoformat()
    bad = farmer.get(f"/api/fields/{field['id']}/irrigation", params={"last_irrigated": future})
    assert bad.status_code == 422
    assert (
        farmer.get(
            f"/api/fields/{field['id']}/irrigation", params={"soil_texture": "mud"}
        ).status_code
        == 422
    )


def test_irrigation_states_without_data(farmer, weather_calls, make_actor):
    tur = _field(farmer, name="Tur plot", current_crop="tur")
    assert farmer.get(f"/api/fields/{tur['id']}/irrigation").json()["status"] == "not_available"
    nocrop = _field(farmer, name="Empty", current_crop=None, sowing_date=None)
    assert farmer.get(f"/api/fields/{nocrop['id']}/irrigation").json()["status"] == "no_crop"
    nodate = _field(farmer, name="No date", sowing_date=None)
    assert farmer.get(f"/api/fields/{nodate['id']}/irrigation").json()["status"] == "no_sowing_date"
    other = make_actor("farmer", name="Other")
    assert other.get(f"/api/fields/{tur['id']}/irrigation").status_code == 404


# ---- Soil tests + fertilizer --------------------------------------------------------------------


def test_soil_test_and_dose(farmer):
    field = _field(farmer, current_crop="wheat", season="rabi")
    bad = farmer.post(f"/api/fields/{field['id']}/soil-tests", {"test_date": "2026-01-01"})
    assert bad.status_code == 422
    future = (datetime.now(IST).date() + timedelta(days=3)).isoformat()
    assert (
        farmer.post(
            f"/api/fields/{field['id']}/soil-tests", {"test_date": future, "n_kg_ha": 200}
        ).status_code
        == 422
    )
    res = farmer.post(
        f"/api/fields/{field['id']}/soil-tests",
        {
            "test_date": "2026-06-10",
            "n_kg_ha": 200,  # low -> x1.25
            "p_kg_ha": 41.2,  # P2O5 41.2 = P 18 -> medium
            "p_basis": "P2O5",
            "k_kg_ha": 320,  # very high -> x0.5
            "oc_pct": 0.5,
            "zn_ppm": 0.4,
        },
    )
    assert res.status_code == 201, res.text
    test = res.json()
    assert len(farmer.get("/api/soil-tests").json()) == 1

    dose = farmer.post(
        "/api/fertilizer/dose",
        {"crop": "wheat", "field_id": field["id"], "soil_test_id": test["id"]},
    )
    assert dose.status_code == 200, dose.text
    d = dose.json()
    ratings = {r["nutrient"]: r for r in d["ratings"]}
    assert ratings["N"]["class"] == "low" and ratings["P"]["class"] == "medium"
    assert ratings["K"]["class"] == "very_high"
    rdf = d["rdf"]
    assert rdf["status"] == "complete" and rdf["source_url"].startswith("https://mpkv.ac.in")
    assert d["dose"]["n"]["per_ha"] == pytest.approx(rdf["n_kg_ha"] * 1.25, abs=0.1)
    assert d["dose"]["k2o"]["per_ha"] == pytest.approx(rdf["k2o_kg_ha"] * 0.5, abs=0.1)
    assert d["dose"]["n"]["per_field"] == pytest.approx(
        d["dose"]["n"]["per_ha"] * 2 / 2.4711, abs=0.2
    )
    products = {p["key"]: p for p in d["products"]}
    assert set(products) == {"dap", "mop", "urea"}
    assert products["urea"]["cost_field_inr"] is not None
    assert products["mop"]["cost_field_inr"] is None  # price set by company
    zn = next(m for m in d["micronutrients"] if m["nutrient"] == "Zn")
    assert zn["deficient"] is True
    assert d["sources"] and d["last_verified"] == "2026-11-24"

    ssp = farmer.post(
        "/api/fertilizer/dose", {"crop": "wheat", "area_acres": 1, "carrier": "ssp"}
    ).json()
    assert {p["key"] for p in ssp["products"]} == {"ssp", "mop", "urea"}
    assert ssp["notes"] == ["no_soil_test"]

    other = farmer.client
    assert other.post("/api/fertilizer/dose", json={"crop": "wheat"}).status_code == 401
    assert farmer.post("/api/fertilizer/dose", {"crop": "turmeric"}).status_code == 422
    assert farmer.post("/api/fertilizer/dose", {"crop": "pomegranate"}).status_code == 404
    flagged = next(
        o
        for o in farmer.get("/api/fertilizer/options", params={"crop": "cotton"}).json()["options"]
        if o["status"] == "conflict_flagged"
    )
    res = farmer.post("/api/fertilizer/dose", {"crop": "cotton", "rdf_id": flagged["id"]})
    assert res.status_code == 422 and res.json()["code"] == "rdf_not_usable"

    assert farmer.delete(f"/api/soil-tests/{test['id']}").status_code == 204
    assert farmer.get("/api/soil-tests").json() == []


def test_other_farmer_cannot_use_my_soil_test(farmer, make_actor):
    field = _field(farmer)
    test = farmer.post(
        f"/api/fields/{field['id']}/soil-tests", {"test_date": "2026-06-10", "n_kg_ha": 300}
    ).json()
    other = make_actor("farmer", name="Other")
    res = other.post("/api/fertilizer/dose", {"crop": "onion", "soil_test_id": test["id"]})
    assert res.status_code == 404
    assert other.delete(f"/api/soil-tests/{test['id']}").status_code == 404


# ---- Crop calendar, schemes, MSP ----------------------------------------------------------------


def test_crop_calendar_for_district(farmer):
    data = farmer.get("/api/crop-calendar").json()
    assert data["region"] == "western_maharashtra"
    wheat = next(i for i in data["items"] if i["crop"] == "wheat")
    assert wheat["entries"] and wheat["entries"][0]["source_url"]
    assert all(e["scope"] in ("district", "region", "state") for e in wheat["entries"])
    assert wheat["msp"][0]["crop"] == "Wheat" and wheat["msp"][0]["marketing_year"] == "2027-28"
    onion = next(i for i in data["items"] if i["crop"] == "onion")
    assert onion["msp"] == []  # no MSP for onion
    nanded = farmer.get("/api/crop-calendar", params={"district": "Nanded"}).json()
    soy = next(i for i in nanded["items"] if i["crop"] == "soybean")
    assert soy["entries"][0]["scope"] == "district"


def test_schemes_and_msp(farmer):
    data = farmer.get("/api/schemes").json()
    assert data["total"] == 26
    assert {s["status"] for s in data["items"]} == {"active", "changed", "unverified"}
    assert farmer.get("/api/schemes", params={"level": "maharashtra"}).json()["total"] == 10
    hits = farmer.get("/api/schemes", params={"q": "kisan samman"}).json()["items"]
    assert hits[0]["id"] == "pm_kisan" and hits[0]["name_mr"]
    assert farmer.get("/api/schemes/pm_kisan").json()["official_url"] == "https://pmkisan.gov.in/"
    assert farmer.get("/api/schemes/nope").status_code == 404
    msp = farmer.get("/api/msp").json()
    latest = [s for s in msp["seasons"] if s["latest"]]
    assert {(s["season"], s["marketing_year"]) for s in latest} >= {
        ("Kharif", "2026-27"),
        ("Rabi", "2027-28"),
    }
    assert any("not a guaranteed" in n for n in msp["notes"])


# ---- KVKs ---------------------------------------------------------------------------------------


def test_research_file_imports_completely(client):
    raw = json.loads(BUNDLED_FILE.read_text(encoding="utf-8"))
    assert default_state(raw) == "Maharashtra"
    with client.app.state.db.session_factory() as db:
        result = import_kvks(db, load_rows(raw), "test", state=default_state(raw))
        assert (result.created, result.skipped) == (50, 0), result.errors
        again = import_bundled(db)
        assert (again.created, again.updated) == (0, 50)
        akola = db.query(KVK).filter(KVK.name == "KVK Akola (Sisa-Udegaon)").one()
        assert akola.email == "pc@kvkakola.org, info@kvkakola.org"
        assert akola.source_url == "https://icar.org.in/en/node/15040"
        assert len(akola.sources) == 4
        assert akola.coords_precision.startswith("village-level")


def test_nearest_kvks(farmer, client):
    with client.app.state.db.session_factory() as db:
        import_bundled(db)
    res = farmer.get("/api/kvks/nearest", params={"limit": 3})
    assert res.status_code == 200, res.text
    rows = res.json()
    assert len(rows) == 3
    assert rows[0]["distance_km"] <= rows[1]["distance_km"] <= rows[2]["distance_km"]
    assert rows[0]["name"] == "KVK Narayangaon (Pune-II)"  # Narayangaon is next to the farmer
    assert rows[0]["coords_approximate"] is True
    assert farmer.get("/api/kvks/nearest", params={"lat": 19.0}).status_code == 422
    listing = farmer.get("/api/kvks", params={"district": "Wardha"}).json()["items"]
    assert listing and listing[0]["coords_approximate"] is False  # published by the KVK
