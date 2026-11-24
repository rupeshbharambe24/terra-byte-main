import pytest

from terrabyte.services.orders import TRANSITIONS


def _product(vendor, **overrides):
    payload = {
        "name": "DAP 18-46-0",
        "category": "fertilizer",
        "unit": "50 kg bag",
        "price_inr": 1350.5,
        "stock": 10,
    }
    payload.update(overrides)
    res = vendor.post("/api/vendor/products", payload)
    assert res.status_code == 201, res.text
    return res.json()


def _order(farmer, items, **overrides):
    payload = {
        "items": items,
        "delivery_address": "At post Narayangaon, Junnar, Pune",
        "payment_method": "cod",
    }
    payload.update(overrides)
    return farmer.post("/api/orders", payload)


@pytest.fixture
def market(make_actor):
    vendor = make_actor("vendor", "Shivneri Krishi")
    other_vendor = make_actor("vendor", "Godavari Agro", district="Nashik")
    farmer = make_actor("farmer", "Ramesh")
    return vendor, other_vendor, farmer


def test_vendor_product_crud_and_ownership(market):
    vendor, other_vendor, farmer = market
    p = _product(vendor)
    assert p["price_inr"] == 1350.5 and p["vendor_name"] == "Shivneri Krishi"

    res = vendor.patch(f"/api/vendor/products/{p['id']}", {"price_inr": 1400, "stock": 3})
    assert res.json()["price_inr"] == 1400 and res.json()["stock"] == 3
    # Another vendor cannot see or change it; a farmer cannot use vendor routes.
    assert other_vendor.patch(f"/api/vendor/products/{p['id']}", {"stock": 0}).status_code == 404
    assert farmer.post("/api/vendor/products", {"name": "x"}).status_code == 403
    assert vendor.patch(f"/api/vendor/products/{p['id']}", {"price_inr": None}).status_code == 422
    assert vendor.patch(f"/api/vendor/products/{p['id']}", {"price_inr": -5}).status_code == 422

    # Deactivated products leave the catalogue but stay in the vendor's own list.
    vendor.patch(f"/api/vendor/products/{p['id']}", {"active": False})
    assert farmer.get("/api/products").json()["total"] == 0
    mine = vendor.get("/api/vendor/products").json()
    assert mine["total"] == 1 and mine["items"][0]["active"] is False


def test_product_image_must_be_own_upload(market, settings):
    vendor, other_vendor, _ = market
    res = vendor.post(
        "/api/vendor/products",
        {
            "name": "Seed",
            "category": "seeds",
            "unit": "pack",
            "price_inr": 10,
            "stock": 1,
            "image_path": f"images/u{other_vendor.id}/{'a' * 32}.jpg",
        },
    )
    assert res.status_code == 422 and res.json()["code"] == "invalid_image_path"


def test_catalogue_filters(market):
    vendor, other_vendor, farmer = market
    _product(vendor, name="Urea neem coated", stock=0)
    _product(vendor, name="Onion seed", category="seeds")
    _product(other_vendor, name="Neem oil", category="pesticide")
    assert farmer.get("/api/products").json()["total"] == 3
    assert farmer.get("/api/products", params={"q": "neem"}).json()["total"] == 2
    assert farmer.get("/api/products", params={"category": "seeds"}).json()["total"] == 1
    assert farmer.get("/api/products", params={"district": "nashik"}).json()["total"] == 1
    assert farmer.get("/api/products", params={"in_stock": True}).json()["total"] == 2
    page = farmer.get("/api/products", params={"limit": 2, "offset": 2}).json()
    assert len(page["items"]) == 1 and page["limit"] == 2


def test_order_prices_and_totals_are_computed_server_side(market):
    vendor, other_vendor, farmer = market
    a = _product(vendor, price_inr=266.5, stock=10)
    b = _product(vendor, name="Onion seed", category="seeds", price_inr=1100, stock=5)
    c = _product(other_vendor, name="Neem oil", category="pesticide", price_inr=450, stock=4)
    res = _order(
        farmer,
        [
            {"product_id": a["id"], "quantity": 3, "unit_price_inr": 1},  # client price ignored
            {"product_id": b["id"], "quantity": 1},
            {"product_id": a["id"], "quantity": 1},  # duplicate lines are merged
            {"product_id": c["id"], "quantity": 2},
        ],
        total_inr=5,
    )
    assert res.status_code == 201, res.text
    orders = res.json()
    assert len(orders) == 2  # one order per vendor
    first = next(o for o in orders if o["vendor_id"] == vendor.id)
    lines = {i["product_name"]: i for i in first["items"]}
    assert lines["DAP 18-46-0"]["quantity"] == 4
    assert lines["DAP 18-46-0"]["unit_price_inr"] == 266.5
    assert lines["DAP 18-46-0"]["line_total_inr"] == 1066.0
    assert first["total_inr"] == 2166.0
    second = next(o for o in orders if o["vendor_id"] == other_vendor.id)
    assert second["total_inr"] == 900.0
    # Stock was decremented.
    assert farmer.get(f"/api/products/{a['id']}").json()["stock"] == 6
    assert farmer.get(f"/api/products/{c['id']}").json()["stock"] == 2
    # The vendor was notified.
    notes = vendor.get("/api/notifications").json()
    assert notes["items"][0]["type"] == "order_placed"


def test_out_of_stock_rolls_back_the_whole_cart(market):
    vendor, other_vendor, farmer = market
    a = _product(vendor, stock=5)
    b = _product(other_vendor, name="Neem oil", stock=1)
    res = _order(
        farmer, [{"product_id": a["id"], "quantity": 2}, {"product_id": b["id"], "quantity": 2}]
    )
    assert res.status_code == 409 and res.json()["code"] == "out_of_stock"
    assert farmer.get(f"/api/products/{a['id']}").json()["stock"] == 5
    assert farmer.get("/api/orders").json()["total"] == 0


def test_inactive_product_and_validation(market):
    vendor, _, farmer = market
    a = _product(vendor)
    vendor.patch(f"/api/vendor/products/{a['id']}", {"active": False})
    res = _order(farmer, [{"product_id": a["id"], "quantity": 1}])
    assert res.status_code == 409 and res.json()["code"] == "product_unavailable"
    assert _order(farmer, [{"product_id": 999, "quantity": 1}]).status_code == 409
    assert _order(farmer, []).status_code == 422
    assert _order(farmer, [{"product_id": a["id"], "quantity": 0}]).status_code == 422
    assert (
        _order(farmer, [{"product_id": a["id"], "quantity": 1}], payment_method="card").status_code
        == 422
    )
    # Only farmers place orders.
    assert _order(vendor, [{"product_id": a["id"], "quantity": 1}]).status_code == 403


def test_full_order_lifecycle_creates_ledger_entry(market):
    vendor, _, farmer = market
    a = _product(vendor, price_inr=500, stock=10)
    order = _order(farmer, [{"product_id": a["id"], "quantity": 2}]).json()[0]
    oid = order["id"]
    assert order["status"] == "placed"

    # Buyer's phone is only visible to the vendor.
    assert vendor.get(f"/api/orders/{oid}").json()["buyer_phone"] == farmer.phone
    assert farmer.get(f"/api/orders/{oid}").json()["buyer_phone"] is None

    # The farmer cannot act as the vendor and vice versa.
    assert farmer.post(f"/api/orders/{oid}/accept").status_code == 403
    for action, expected in (("accept", "accepted"), ("ship", "shipped"), ("deliver", "delivered")):
        res = vendor.post(f"/api/orders/{oid}/{action}")
        assert res.status_code == 200, res.text
        assert res.json()["status"] == expected
    body = farmer.get(f"/api/orders/{oid}").json()
    assert body["accepted_at"] and body["shipped_at"] and body["delivered_at"]

    types = [n["type"] for n in farmer.get("/api/notifications").json()["items"]]
    assert {"order_accepted", "order_shipped", "order_delivered"} <= set(types)

    ledger = farmer.get("/api/ledger").json()
    assert ledger["total"] == 1
    entry = ledger["items"][0]
    assert entry["order_id"] == oid and entry["amount_inr"] == 1000.0
    assert entry["type"] == "expense" and entry["category"] == "farm_inputs"


@pytest.mark.parametrize(
    ("path", "action"),
    [
        ([], "ship"),
        ([], "deliver"),
        (["accept"], "accept"),
        (["accept"], "reject"),
        (["accept", "ship"], "accept"),
        (["reject"], "accept"),
        (["accept", "ship", "deliver"], "ship"),
    ],
)
def test_invalid_vendor_transitions_return_409(market, path, action):
    vendor, _, farmer = market
    a = _product(vendor)
    oid = _order(farmer, [{"product_id": a["id"], "quantity": 1}]).json()[0]["id"]
    for step in path:
        assert vendor.post(f"/api/orders/{oid}/{step}").status_code == 200
    res = vendor.post(f"/api/orders/{oid}/{action}")
    assert res.status_code == 409 and res.json()["code"] == "invalid_transition"


def test_state_machine_table():
    assert {k: (sorted(v.sources), v.target, v.actor) for k, v in TRANSITIONS.items()} == {
        "accept": (["placed"], "accepted", "vendor"),
        "reject": (["placed"], "rejected", "vendor"),
        "ship": (["accepted"], "shipped", "vendor"),
        "deliver": (["shipped"], "delivered", "vendor"),
        "cancel": (["placed"], "cancelled", "buyer"),
    }


def test_cancel_and_reject_restore_stock_once(market):
    vendor, _, farmer = market
    a = _product(vendor, stock=10)
    o1 = _order(farmer, [{"product_id": a["id"], "quantity": 4}]).json()[0]["id"]
    o2 = _order(farmer, [{"product_id": a["id"], "quantity": 3}]).json()[0]["id"]
    assert farmer.get(f"/api/products/{a['id']}").json()["stock"] == 3

    res = farmer.post(f"/api/orders/{o1}/cancel", {"reason": "Ordered by mistake"})
    assert (
        res.json()["status"] == "cancelled" and res.json()["status_reason"] == "Ordered by mistake"
    )
    assert farmer.post(f"/api/orders/{o1}/cancel").status_code == 409  # not twice
    assert vendor.post(f"/api/orders/{o2}/reject", {"reason": "No transport"}).status_code == 200
    assert farmer.get(f"/api/products/{a['id']}").json()["stock"] == 10
    assert vendor.get("/api/notifications").json()["items"][0]["type"] == "order_cancelled"
    assert farmer.get("/api/notifications").json()["items"][0]["type"] == "order_rejected"


def test_farmer_cannot_cancel_after_acceptance(market):
    vendor, _, farmer = market
    a = _product(vendor)
    oid = _order(farmer, [{"product_id": a["id"], "quantity": 1}]).json()[0]["id"]
    vendor.post(f"/api/orders/{oid}/accept")
    assert farmer.post(f"/api/orders/{oid}/cancel").status_code == 409


def test_order_visibility(market, make_actor, admin):
    vendor, other_vendor, farmer = market
    stranger = make_actor("farmer", "Other farmer")
    a = _product(vendor)
    oid = _order(farmer, [{"product_id": a["id"], "quantity": 1}]).json()[0]["id"]
    assert stranger.get(f"/api/orders/{oid}").status_code == 404
    assert other_vendor.get(f"/api/orders/{oid}").status_code == 404
    assert other_vendor.post(f"/api/orders/{oid}/accept").status_code == 404
    assert stranger.get("/api/orders").json()["total"] == 0
    assert vendor.get("/api/orders", params={"status": "placed"}).json()["total"] == 1
    assert vendor.get("/api/orders", params={"status": "delivered"}).json()["total"] == 0
    assert admin.get("/api/orders").json()["total"] == 1
    expert = make_actor("expert")
    assert expert.get("/api/orders").status_code == 403


def test_concurrent_orders_never_oversell(tmp_path):
    """Six buyers race for three units on a real SQLite file: exactly three orders succeed."""
    import threading

    from terrabyte.db import Database
    from terrabyte.errors import ApiError
    from terrabyte.models import Product, User, UserRole, UserStatus
    from terrabyte.schemas.market import OrderIn
    from terrabyte.services.orders import place_orders

    database = Database(f"sqlite:///{tmp_path / 'race.db'}")
    database.create_all()
    with database.session_factory() as db:
        vendor = User(
            name="V",
            phone="9811999001",
            password_hash="x",
            role=UserRole.vendor,
            status=UserStatus.approved,
        )
        buyers = [
            User(
                name=f"F{i}",
                phone=f"981199910{i}",
                password_hash="x",
                role=UserRole.farmer,
                status=UserStatus.approved,
            )
            for i in range(6)
        ]
        db.add_all([vendor, *buyers])
        db.flush()
        product = Product(
            vendor_id=vendor.id,
            name="DAP",
            category="fertilizer",
            unit="bag",
            price_inr=1350,
            stock=3,
        )
        db.add(product)
        db.commit()
        pid, buyer_ids = product.id, [b.id for b in buyers]

    results: list[str] = []
    barrier = threading.Barrier(len(buyer_ids))

    def attempt(buyer_id: int) -> None:
        with database.session_factory() as db:
            buyer = db.get(User, buyer_id)
            data = OrderIn(
                items=[{"product_id": pid, "quantity": 1}],
                delivery_address="Village road",
                payment_method="cod",
            )
            barrier.wait()
            try:
                place_orders(db, buyer, data)
                results.append("ok")
            except ApiError as exc:
                results.append(exc.code)

    threads = [threading.Thread(target=attempt, args=(b,)) for b in buyer_ids]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(results) == ["ok"] * 3 + ["out_of_stock"] * 3, results
    with database.session_factory() as db:
        assert db.get(Product, pid).stock == 0
    database.engine.dispose()
