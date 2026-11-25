from __future__ import annotations

import math
import random
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from openpyxl import Workbook
from sqlalchemy import select

from terrabyte.models import DataImport, Field, MandiPrice, ModelEvaluation
from terrabyte.prices import normalise as norm
from terrabyte.prices.evaluate import evaluate_all
from terrabyte.prices.forecast import backtest, fit_ets, make_forecast
from terrabyte.prices.ingest import (
    CURRENT_RESOURCE,
    HISTORY_RESOURCE,
    DataGovClient,
    FetchError,
    ingest_current,
    ingest_history,
)
from terrabyte.prices.legacy_import import import_legacy
from terrabyte.prices.store import row_from_record
from terrabyte.timeutil import today_ist

# ---- normalisation ------------------------------------------------------------------------------


def test_normalise_names_prices_and_dates():
    assert norm.market_name("Pune(Manjri) ") == "Pune(Manjri)"
    assert norm.market_name("Chakan") == "Khed(Chakan)"
    assert norm.market_name("  APMC   Junnar ") == "APMC Junnar"
    assert norm.market_name("Ausa APMC ") == "APMC Ausa"
    assert norm.commodity_name("Bhendi") == "Bhindi(Ladies Finger)"
    assert norm.price("1,250") == Decimal("1250.00")
    assert norm.price(1100) == Decimal("1100.00")
    assert norm.price("0") is None
    assert norm.price("NR") is None
    assert norm.arrival_date("04/11/2025") == date(2025, 11, 4)
    assert norm.arrival_date("04-11-2025") == date(2025, 11, 4)
    assert norm.arrival_date("garbage") is None


def test_row_from_record_handles_both_resources():
    current = {
        "state": "Maharashtra",
        "district": "Pune",
        "market": "Pune(Moshi) ",
        "commodity": "Onion",
        "variety": "Local",
        "grade": "Local",
        "arrival_date": "24/11/2026",
        "min_price": 2000,
        "max_price": 4500,
        "modal_price": 3250,
    }
    row = row_from_record(current)
    assert row is not None and row.market == "Pune(Moshi)" and row.modal_price == Decimal(3250)
    history = {
        "State": "Maharashtra",
        "District": "Pune",
        "Market": "Pune",
        "Commodity": "Onion",
        "Variety": "Local",
        "Grade": "Local",
        "Arrival_Date": "04/11/2025",
        "Min_Price": "400",
        "Max_Price": "1800",
        "Modal_Price": "1100",
    }
    row = row_from_record(history)
    assert row is not None and row.arrival_date == date(2025, 11, 4)
    assert row_from_record({**history, "Max_Price": "900"}) is None  # modal above max
    assert row_from_record({**history, "Modal_Price": ""}) is None


# ---- data.gov.in ingest (network mocked) --------------------------------------------------------


def _record(day: date, market: str = "Pune(Manjri) ", modal: int = 3000, variety: str = "Local"):
    return {
        "state": "Maharashtra",
        "district": "Pune",
        "market": market,
        "commodity": "Onion",
        "variety": variety,
        "grade": "Local",
        "arrival_date": day.strftime("%d/%m/%Y"),
        "min_price": modal - 500,
        "max_price": modal + 500,
        "modal_price": modal,
    }


class FakeApi:
    def __init__(self, records: list[dict], fail_first: int = 0) -> None:
        self.records = records
        self.calls: list[str] = []
        self.fail_first = fail_first

    def __call__(self, url: str) -> dict:
        self.calls.append(url)
        if self.fail_first:
            self.fail_first -= 1
            raise FetchError("HTTP 429")
        from urllib.parse import parse_qs, urlparse

        q = parse_qs(urlparse(url).query)
        offset, limit = int(q["offset"][0]), int(q["limit"][0])
        return {"total": len(self.records), "records": self.records[offset : offset + limit]}


def test_ingest_current_paginates_retries_and_logs(client):
    today = today_ist()
    api = FakeApi([_record(today, market=f"Market {i}") for i in range(23)], fail_first=1)
    sleeps: list[float] = []
    cli = DataGovClient(api_key=None, fetch=api, sleep=sleeps.append)
    with client.app.state.db.session_factory() as db:
        result = ingest_current(db, cli, "Maharashtra", ["Onion"], max_rows=1000)
        assert result.created == 23
        assert db.scalar(select(DataImport).where(DataImport.kind == "mandi_prices")) is not None
        # Re-running updates nothing and creates nothing (idempotent upsert).
        again = ingest_current(
            db,
            DataGovClient(None, fetch=FakeApi(api.records), sleep=lambda s: None),
            "Maharashtra",
            ["Onion"],
            1000,
        )
        assert (again.created, again.updated) == (0, 0)
    assert all(CURRENT_RESOURCE in u for u in api.calls)
    assert "limit=10" in api.calls[-1]  # sample key -> 10 rows per call
    assert "filters%5Bstate.keyword%5D=Maharashtra" in api.calls[-1]
    assert 45.0 in sleeps  # backoff after the 429


def test_ingest_current_records_errors_when_api_keeps_failing(client):
    api = FakeApi([], fail_first=99)
    cli = DataGovClient(api_key="k", fetch=api, sleep=lambda s: None, max_retries=2)
    with client.app.state.db.session_factory() as db:
        result = ingest_current(db, cli, "Maharashtra", ["Onion"], max_rows=100)
    assert result.created == 0 and result.errors


def test_ingest_history_stops_at_since(client):
    today = today_ist()
    records = [_record(today - timedelta(days=i)) for i in range(60)]
    api = FakeApi(records)
    cli = DataGovClient(api_key="personal", fetch=api, sleep=lambda s: None)
    assert cli.page_size == 1000
    with client.app.state.db.session_factory() as db:
        res = ingest_history(
            db, cli, "Maharashtra", "Onion", "Pune(Manjri)", None, today - timedelta(days=29), 500
        )
        assert res.created == 30
        stored = db.scalars(select(MandiPrice.market)).all()
    assert set(stored) == {"Pune(Manjri)"}
    assert HISTORY_RESOURCE in api.calls[0] and "sort%5BArrival_Date%5D=desc" in api.calls[0]


# ---- legacy import ------------------------------------------------------------------------------


def _legacy_dir(tmp_path: Path) -> Path:
    wb = Workbook()
    ws = wb.active
    ws.append(
        [
            "Price Date",
            "District Name",
            "Commodity",
            "Market Name",
            "Modal Price (Rs./Quintal)",
            "temp",
        ]
    )
    ws.append([date(2021, 1, 1), "Pune", "Onion", "Alephata", 2330.0, 72.0])
    ws.append([date(2021, 1, 2), "Pune", "Onion", "Chakan", 2500.0, 72.6])
    ws.append([date(2021, 1, 3), "Pune", "Onion", "Chakan", None, 70.0])
    wb.save(tmp_path / "Onion_Merged_with_distance.xlsx")
    return tmp_path


def test_legacy_import_stores_actual_market_per_row(client, tmp_path):
    with client.app.state.db.session_factory() as db:
        result = import_legacy(db, _legacy_dir(tmp_path))
        rows = db.scalars(select(MandiPrice).order_by(MandiPrice.arrival_date)).all()
    assert result.created == 2 and result.skipped >= 1
    assert [r.market for r in rows] == ["Junnar(Alephata)", "Khed(Chakan)"]
    assert rows[0].min_price is None and float(rows[0].modal_price) == 2330.0


# ---- forecasting --------------------------------------------------------------------------------


def _dates(n: int, end: date) -> list[date]:
    return [end - timedelta(days=n - 1 - i) for i in range(n)]


def test_backtest_prefers_naive_on_a_random_walk():
    rng = random.Random(1)
    values, v = [], 2000.0
    for _ in range(220):
        v *= math.exp(rng.gauss(0, 0.04))
        values.append(v)
    res = backtest(_dates(220, date(2026, 11, 20)), values)
    assert res is not None
    assert res.n_origins >= 20
    assert set(res.mase_1_7) == {"naive", "seasonal_naive", "ets"}
    # A pure random walk cannot be beaten by much: the chosen method is never worse than naive.
    assert res.mase_1_7[res.chosen] <= res.mase_1_7["naive"]


def test_backtest_picks_ets_on_noisy_mean_reverting_series_and_intervals_cover():
    rng = random.Random(7)
    values = [2000 * math.exp(rng.gauss(0, 0.15)) for _ in range(240)]
    res = backtest(_dates(240, date(2026, 11, 20)), values)
    assert res is not None and res.chosen == "ets"
    assert res.mase_1_7["ets"] < res.mase_1_7["naive"]
    assert 0.6 <= res.coverage["ets"] <= 0.98
    method, points, ranges = make_forecast(
        _dates(240, date(2026, 11, 20)), values, res.to_details()
    )
    assert method == "ets" and len(points) == 7 and [r.horizon_days for r in ranges] == [14, 28]
    assert all(p.low <= p.point <= p.high for p in points)
    assert all(r.point is None and r.low < r.high for r in ranges)


def test_backtest_needs_enough_data():
    assert backtest(_dates(30, date(2026, 1, 1)), [100.0] * 30) is None


def test_fit_ets_returns_valid_parameters():
    fit = fit_ets([100.0, 102.0, 101.0, 105.0, 107.0, 110.0])
    assert 0 < fit.alpha <= 1 and 0 < fit.phi <= 1


# ---- API ----------------------------------------------------------------------------------------


def _seed_series(client, market: str, commodity: str, end: date, n: int, seed: int = 3):
    rng = random.Random(seed)
    with client.app.state.db.session_factory() as db:
        for d in _dates(n, end):
            modal = round(2000 * math.exp(rng.gauss(0, 0.12)))
            db.add(
                MandiPrice(
                    state="Maharashtra",
                    district="Pune",
                    market=market,
                    commodity=commodity,
                    variety="Local",
                    grade="FAQ",
                    arrival_date=d,
                    min_price=Decimal(modal - 300),
                    max_price=Decimal(modal + 300),
                    modal_price=Decimal(modal),
                    source="test",
                )
            )
        db.commit()


def test_price_endpoints_latest_history_and_forecast(client, make_actor):
    farmer = make_actor("farmer")
    today = today_ist()
    _seed_series(client, "Pune(Manjri)", "Onion", today - timedelta(days=2), 200)
    _seed_series(client, "Pune", "Tomato", date(2025, 5, 27), 150)

    latest = farmer.get("/api/prices/latest").json()
    assert {i["commodity"] for i in latest["items"]} == {"Onion", "Tomato"}
    tomato = next(i for i in latest["items"] if i["commodity"] == "Tomato")
    assert tomato["stale"] is True and tomato["arrival_date"] == "2025-05-27"
    assert latest["as_of"] == (today - timedelta(days=2)).isoformat()

    hist = farmer.get(
        "/api/prices/history", params={"market": "Pune(Manjri)", "commodity": "Onion", "days": 30}
    ).json()
    assert hist["variety"] == "Local" and len(hist["points"]) == 31
    assert (
        farmer.get(
            "/api/prices/history", params={"market": "Nowhere", "commodity": "Onion"}
        ).status_code
        == 404
    )

    # Stale data: never forecast.
    stale = farmer.get(
        "/api/prices/forecast", params={"market": "Pune", "commodity": "Tomato"}
    ).json()
    assert stale["status"] == "stale" and stale["points"] == []
    # Current data but no backtest yet.
    pending = farmer.get(
        "/api/prices/forecast", params={"market": "Pune(Manjri)", "commodity": "Onion"}
    ).json()
    assert pending["status"] == "not_evaluated"

    with client.app.state.db.session_factory() as db:
        done = evaluate_all(db)
        assert {k for k, _ in done} == {"Onion @ Pune(Manjri)", "Tomato @ Pune"}
        assert db.query(ModelEvaluation).count() == 6

    ok = farmer.get(
        "/api/prices/forecast", params={"market": "Pune(Manjri)", "commodity": "Onion"}
    ).json()
    assert ok["status"] == "ok" and ok["method"] in ("ets", "naive")
    assert len(ok["points"]) == 7 and len(ok["ranges"]) == 2
    assert ok["skill"]["mase_naive"] > 0
    assert (
        farmer.get("/api/prices/forecast", params={"market": "X", "commodity": "Y"}).json()[
            "status"
        ]
        == "no_data"
    )


def test_msp_lookup_is_official_or_absent(client, make_actor):
    farmer = make_actor("farmer")
    soy = farmer.get("/api/prices/msp", params={"commodity": "Soyabean"}).json()
    assert soy["has_msp"] is True
    assert soy["rows"][0]["crop"] == "Soybean (Yellow)"
    assert soy["rows"][0]["source_url"].startswith("https://www.pib.gov.in/")
    onion = farmer.get("/api/prices/msp", params={"commodity": "Onion"}).json()
    assert onion["has_msp"] is False and onion["rows"] == [] and "No MSP" in onion["note"]


def test_my_prices_uses_field_crops_and_district(client, make_actor):
    farmer = make_actor("farmer", district="Pune")
    _seed_series(client, "Pune(Manjri)", "Onion", today_ist(), 3)
    _seed_series(client, "Pune(Manjri)", "Potato", today_ist(), 3)
    with client.app.state.db.session_factory() as db:
        db.add(Field(owner_id=farmer.id, name="Plot 1", area_acres=2, current_crop="onion"))
        db.commit()
    mine = farmer.get("/api/prices/mine").json()
    assert mine["crops"] == ["onion"]
    assert {i["commodity"] for i in mine["items"]} == {"Onion"}


def test_price_imports_admin_only(client, make_actor, admin_token):
    farmer = make_actor("farmer")
    assert farmer.get("/api/admin/price-imports").status_code == 403
    res = client.get("/api/admin/price-imports", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200 and res.json() == []


@pytest.mark.parametrize("path", ["/api/prices/latest", "/api/prices/commodities"])
def test_prices_require_login(client, path):
    assert client.get(path).status_code == 401
