from datetime import UTC, date, datetime, timedelta

import pytest

from terrabyte.models import ModelEvaluation
from terrabyte.services.analytics import day_series, response_times
from terrabyte.services.common import money
from terrabyte.timeutil import today_ist


@pytest.fixture
def farmer(make_actor):
    return make_actor("farmer", "Ramesh")


def test_notifications_pagination_and_unread_count(farmer, admin):
    vendor_reg = farmer.client.post(
        "/api/auth/register",
        json={
            "name": "Agro One",
            "phone": "9822000009",
            "password": "secret-pass-1",
            "role": "vendor",
        },
    )
    assert vendor_reg.status_code == 201
    assert admin.get("/api/notifications/unread-count").json() == {"unread": 1}
    page = admin.get("/api/notifications", params={"limit": 1, "unread_only": True}).json()
    assert page["total"] == 1 and page["unread"] == 1
    admin.post(f"/api/notifications/{page['items'][0]['id']}/read")
    assert admin.get("/api/notifications/unread-count").json() == {"unread": 0}
    assert farmer.post(f"/api/notifications/{page['items'][0]['id']}/read").status_code == 404


def test_dashboards_compute_from_rows(make_actor, admin):
    vendor, farmer, owner, expert = (
        make_actor("vendor"),
        make_actor("farmer"),
        make_actor("hardware_vendor"),
        make_actor("expert"),
    )
    # Empty state: zeros, never invented numbers.
    empty = vendor.get("/api/dashboard/vendor").json()
    assert empty["revenue_total"] == 0 and empty["top_products"] == []
    assert len(empty["orders_last_30_days"]) == 30
    assert sum(d["count"] for d in empty["orders_last_30_days"]) == 0
    assert owner.get("/api/dashboard/hardware").json()["utilisation_overall"] is None

    p = vendor.post(
        "/api/vendor/products",
        {"name": "DAP", "category": "fertilizer", "unit": "bag", "price_inr": 1350, "stock": 6},
    ).json()
    order = {"delivery_address": "Village road", "payment_method": "cod"}
    o1 = farmer.post(
        "/api/orders", {**order, "items": [{"product_id": p["id"], "quantity": 2}]}
    ).json()[0]
    farmer.post("/api/orders", {**order, "items": [{"product_id": p["id"], "quantity": 1}]})
    for action in ("accept", "ship", "deliver"):
        vendor.post(f"/api/orders/{o1['id']}/{action}")

    v = vendor.get("/api/dashboard/vendor").json()
    assert v["orders_by_status"] == {"delivered": 1, "placed": 1}
    assert (v["revenue_total"], v["revenue_this_month"], v["open_orders"]) == (2700.0, 2700.0, 1)
    assert v["top_products"] == [{"name": "DAP", "quantity": 2, "revenue": 2700.0}]
    assert v["low_stock"][0]["stock"] == 3
    assert v["orders_last_30_days"][-1]["count"] == 2

    f = farmer.get("/api/dashboard/farmer").json()
    assert f["open_orders"] == 1 and f["month_expense"] == 2700.0 and f["month_income"] == 0
    assert f["unread_notifications"] >= 3

    eq = owner.post(
        "/api/hardware/equipment", {"name": "Tractor", "type": "tractor", "rate_per_day_inr": 6000}
    ).json()
    start = (datetime.now(UTC) + timedelta(days=2)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    b = farmer.post(
        "/api/bookings",
        {
            "equipment_id": eq["id"],
            "unit": "day",
            "start_at": start.isoformat(),
            "end_at": (start + timedelta(days=1)).isoformat(),
        },
    ).json()
    h = owner.get("/api/dashboard/hardware").json()
    assert h["pending_requests"] == 1 and h["upcoming"][0]["id"] == b["id"]
    assert h["utilisation_overall"] == 0.0  # future bookings are not past use
    assert farmer.get("/api/dashboard/farmer").json()["upcoming_bookings_count"] == 1

    c = farmer.post(
        "/api/consultations",
        {"category": "pest", "question": "Small holes in cabbage leaves, what to check?"},
    ).json()
    expert.post(f"/api/consultations/{c['id']}/claim")
    expert.post(f"/api/consultations/{c['id']}/messages", {"body": "Look under the leaves."})
    e = expert.get("/api/dashboard/expert").json()
    assert e["answered_by_me"] == 1 and e["response_times"]["responded"] == 1

    a = admin.get("/api/admin/analytics").json()
    assert a["users_by_role"]["farmer"] == 1 and a["users_by_role"]["admin"] == 1
    assert a["delivered_order_value"] == 2700.0 and a["orders_by_status"]["placed"] == 1
    assert a["consultations_by_status"] == {"answered": 1}
    assert sum(d["count"] for d in a["new_users_last_30_days"]) == 5
    for actor, url in (
        (farmer, "/api/dashboard/vendor"),
        (vendor, "/api/dashboard/farmer"),
        (farmer, "/api/admin/analytics"),
        (expert, "/api/dashboard/hardware"),
    ):
        assert actor.get(url).status_code == 403


def test_model_evaluations_only_show_stored_rows(client, admin, farmer):
    assert admin.get("/api/admin/model-evaluations").json()["total"] == 0
    with client.app.state.db.session_factory() as db:
        db.add(
            ModelEvaluation(
                model_name="disease-cnn",
                version="v2",
                dataset="held-out",
                metric_name="top1",
                value=0.9,
            )
        )
        db.commit()
    rows = admin.get("/api/admin/model-evaluations").json()["items"]
    assert [(r["model_name"], r["value"]) for r in rows] == [("disease-cnn", 0.9)]
    assert farmer.get("/api/admin/model-evaluations").status_code == 403


def test_aggregate_helpers():
    today = today_ist()
    noon_today = datetime.combine(today, datetime.min.time(), tzinfo=UTC) + timedelta(hours=6)
    series = day_series(
        [
            (noon_today, money("10.50")),
            (noon_today, None),
            (noon_today - timedelta(days=45), money(5)),
        ]
    )
    assert len(series) == 30 and series[-1].date == today
    assert (series[-1].count, series[-1].value) == (2, money("10.50"))
    assert sum(p.count for p in series) == 2
    t0 = datetime(2026, 1, 1, tzinfo=UTC)
    rt = response_times(
        [
            (t0, t0 + timedelta(hours=2)),
            (t0, t0 + timedelta(hours=4)),
            (t0, None),
            (t0, t0 + timedelta(hours=9)),
        ]
    )
    assert (rt.responded, rt.median_hours, rt.average_hours) == (3, 4.0, 5.0)
    assert response_times([]).median_hours is None
    assert isinstance(today, date)
