import pytest

from terrabyte.timeutil import today_ist


@pytest.fixture
def farmer(make_actor):
    return make_actor("farmer", "Ramesh")


def test_fields_crud_and_ownership(farmer, make_actor):
    other = make_actor("farmer", "Sunita")
    res = farmer.post(
        "/api/fields", {"name": "Well-side plot", "area_acres": 2.5, "lat": 19.1, "lon": 73.9}
    )
    assert res.status_code == 201
    fid = res.json()["id"]
    assert (
        farmer.patch(f"/api/fields/{fid}", {"current_crop": "Onion"}).json()["current_crop"]
        == "Onion"
    )
    assert farmer.patch(f"/api/fields/{fid}", {"area_acres": None}).status_code == 422
    assert farmer.post("/api/fields", {"name": "x", "area_acres": 0}).status_code == 422
    assert (
        farmer.post(
            "/api/fields", {"name": "x", "area_acres": 1, "lat": 73.9, "lon": 19.1}
        ).status_code
        == 422
    )
    assert other.patch(f"/api/fields/{fid}", {"name": "mine"}).status_code == 404
    assert other.delete(f"/api/fields/{fid}").status_code == 404
    assert other.get("/api/fields").json() == []
    assert make_actor("vendor").get("/api/fields").status_code == 403
    assert farmer.delete(f"/api/fields/{fid}").status_code == 204
    assert farmer.get("/api/fields").json() == []


def test_ledger_crud_summary_and_csv(farmer, make_actor):
    fid = farmer.post("/api/fields", {"name": "Plot A", "area_acres": 1}).json()["id"]
    entries = [
        ("2026-10-05", "expense", "seeds", 1100.5, fid, None),
        ("2026-10-20", "expense", "labour", 900, None, "=HYPERLINK(evil)"),
        ("2026-11-02", "income", "crop_sale", 5000, fid, "Onion sale"),
        ("2026-11-10", "expense", "seeds", 400, fid, None),
    ]
    for d, t, c, amount, field_id, note in entries:
        res = farmer.post(
            "/api/ledger",
            {
                "entry_date": d,
                "type": t,
                "category": c,
                "amount_inr": amount,
                "field_id": field_id,
                "note": note,
            },
        )
        assert res.status_code == 201, res.text
    # Category must match the type; amounts must be positive; the field must be yours.
    bad = {"entry_date": "2026-11-01", "type": "income", "category": "seeds", "amount_inr": 5}
    assert farmer.post("/api/ledger", bad).status_code == 422
    assert (
        farmer.post("/api/ledger", {**bad, "category": "subsidy", "amount_inr": -1}).status_code
        == 422
    )
    other = make_actor("farmer")
    assert (
        other.post("/api/ledger", {**bad, "category": "subsidy", "field_id": fid}).status_code
        == 404
    )

    summary = farmer.get("/api/ledger/summary").json()
    assert (summary["income"], summary["expense"], summary["net"]) == (5000.0, 2400.5, 2599.5)
    assert summary["by_month"] == [
        {"month": "2026-10", "income": 0.0, "expense": 2000.5},
        {"month": "2026-11", "income": 5000.0, "expense": 400.0},
    ]
    seeds = next(c for c in summary["by_category"] if c["category"] == "seeds")
    assert seeds["amount"] == 1500.5
    plot = next(f for f in summary["by_field"] if f["field_id"] == fid)
    assert (plot["field_name"], plot["income"], plot["expense"]) == ("Plot A", 5000.0, 1500.5)
    november = farmer.get(
        "/api/ledger/summary", params={"from": "2026-11-01", "to": "2026-11-30"}
    ).json()
    assert november["entries"] == 2
    assert farmer.get("/api/ledger", params={"type": "income"}).json()["total"] == 1
    assert farmer.get("/api/ledger", params={"field_id": fid}).json()["total"] == 3
    assert other.get("/api/ledger").json()["total"] == 0

    res = farmer.get("/api/ledger/export.csv")
    assert res.status_code == 200 and res.headers["content-type"].startswith("text/csv")
    lines = res.text.lstrip("﻿").splitlines()
    assert lines[0].startswith("date,type,category,amount_inr")
    assert lines[1].startswith("2026-10-05,expense,seeds,1100.50,Plot A")
    assert "'=HYPERLINK(evil)" in res.text  # formula injection neutralised

    entry_id = farmer.get("/api/ledger").json()["items"][0]["id"]
    assert farmer.patch(f"/api/ledger/{entry_id}", {"amount_inr": 450}).json()["amount_inr"] == 450
    assert farmer.patch(f"/api/ledger/{entry_id}", {"category": "crop_sale"}).status_code == 422
    assert other.delete(f"/api/ledger/{entry_id}").status_code == 404
    assert farmer.delete(f"/api/ledger/{entry_id}").status_code == 204


def test_linked_entries_keep_their_amount(make_actor):
    vendor, farmer = make_actor("vendor"), make_actor("farmer")
    p = vendor.post(
        "/api/vendor/products",
        {"name": "Urea", "category": "fertilizer", "unit": "bag", "price_inr": 266.5, "stock": 5},
    ).json()
    oid = farmer.post(
        "/api/orders",
        {
            "items": [{"product_id": p["id"], "quantity": 2}],
            "delivery_address": "Village road",
            "payment_method": "upi_on_delivery",
        },
    ).json()[0]["id"]
    for action in ("accept", "ship", "deliver"):
        vendor.post(f"/api/orders/{oid}/{action}")
    entry = farmer.get("/api/ledger").json()["items"][0]
    assert entry["amount_inr"] == 533.0 and entry["entry_date"] == today_ist().isoformat()
    res = farmer.patch(f"/api/ledger/{entry['id']}", {"amount_inr": 1})
    assert res.status_code == 409 and res.json()["code"] == "linked_entry"
    assert farmer.patch(f"/api/ledger/{entry['id']}", {"category": "fertilizer"}).status_code == 200
