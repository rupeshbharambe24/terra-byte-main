import threading
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from terrabyte.config import Settings
from terrabyte.db import Database
from terrabyte.errors import ApiError
from terrabyte.models import Booking, Equipment, RentalUnit, User, UserRole, UserStatus
from terrabyte.schemas.rental import BookingIn
from terrabyte.services import bookings as booking_service
from terrabyte.services.bookings import TRANSITIONS, booking_units, create_booking

BASE = (datetime.now(UTC) + timedelta(days=3)).replace(hour=4, minute=30, second=0, microsecond=0)


def iso(dt: datetime) -> str:
    return dt.isoformat()


@pytest.fixture
def rental(make_actor):
    owner = make_actor("hardware_vendor", "Junnar Tractor Hire")
    other_owner = make_actor("hardware_vendor", "Niphad Machinery", district="Nashik")
    farmer = make_actor("farmer", "Ramesh")
    res = owner.post(
        "/api/hardware/equipment",
        {
            "name": "Tractor 45 HP",
            "type": "tractor",
            "rate_per_hour_inr": 900,
            "rate_per_day_inr": 6000,
        },
    )
    assert res.status_code == 201, res.text
    return owner, other_owner, farmer, res.json()


def _book(farmer, eq_id, start, end, unit="hour"):
    return farmer.post(
        "/api/bookings",
        {"equipment_id": eq_id, "unit": unit, "start_at": iso(start), "end_at": iso(end)},
    )


def test_equipment_crud_and_ownership(rental):
    owner, other_owner, farmer, eq = rental
    assert eq["district"] == "Pune"  # defaults to the owner's district
    res = owner.patch(f"/api/hardware/equipment/{eq['id']}", {"rate_per_day_inr": 6500})
    assert res.json()["rate_per_day_inr"] == 6500
    assert (
        other_owner.patch(f"/api/hardware/equipment/{eq['id']}", {"active": False}).status_code
        == 404
    )
    assert farmer.post("/api/hardware/equipment", {"name": "x"}).status_code == 403
    # At least one rate is required.
    res = owner.post("/api/hardware/equipment", {"name": "Sprayer", "type": "sprayer"})
    assert res.status_code == 422
    res = owner.patch(
        f"/api/hardware/equipment/{eq['id']}", {"rate_per_hour_inr": None, "rate_per_day_inr": None}
    )
    assert res.status_code == 422
    assert owner.post("/api/hardware/equipment", {"name": "Car", "type": "car"}).status_code == 422


def test_catalogue_filters(rental):
    owner, other_owner, farmer, eq = rental
    other_owner.post(
        "/api/hardware/equipment",
        {"name": "Power sprayer", "type": "sprayer", "rate_per_day_inr": 500},
    )
    assert farmer.get("/api/equipment").json()["total"] == 2
    assert farmer.get("/api/equipment", params={"type": "sprayer"}).json()["total"] == 1
    assert farmer.get("/api/equipment", params={"district": "pune"}).json()["total"] == 1
    owner.patch(f"/api/hardware/equipment/{eq['id']}", {"active": False})
    assert farmer.get("/api/equipment").json()["total"] == 1


def test_amount_is_computed_from_the_rate(rental):
    _, _, farmer, eq = rental
    res = _book(farmer, eq["id"], BASE, BASE + timedelta(hours=3))
    assert res.status_code == 201, res.text
    b = res.json()
    assert (b["units"], b["rate_inr"], b["amount_inr"], b["status"]) == (3, 900, 2700, "requested")
    res = _book(farmer, eq["id"], BASE + timedelta(days=5), BASE + timedelta(days=7), "day")
    assert (res.json()["units"], res.json()["amount_inr"]) == (2, 12000)


def test_booking_period_validation(rental):
    owner, _, farmer, eq = rental
    past = datetime.now(UTC) - timedelta(days=1)
    cases = [
        (BASE, BASE, "hour", "invalid_period"),
        (BASE, BASE + timedelta(minutes=90), "hour", "invalid_period"),
        (BASE, BASE + timedelta(hours=30), "day", "invalid_period"),
        (BASE, BASE + timedelta(hours=73), "hour", "invalid_period"),
        (past, past + timedelta(hours=2), "hour", "start_in_past"),
    ]
    for start, end, unit, code in cases:
        res = _book(farmer, eq["id"], start, end, unit)
        assert res.status_code == 422 and res.json()["code"] == code, (start, end, unit)
    # Naive datetimes are refused (time zone required).
    res = farmer.post(
        "/api/bookings",
        {
            "equipment_id": eq["id"],
            "unit": "hour",
            "start_at": "2030-01-01T10:00:00",
            "end_at": "2030-01-01T12:00:00",
        },
    )
    assert res.status_code == 422
    # A unit the owner does not offer.
    sprayer = owner.post(
        "/api/hardware/equipment", {"name": "Sprayer", "type": "sprayer", "rate_per_day_inr": 500}
    ).json()
    res = _book(farmer, sprayer["id"], BASE, BASE + timedelta(hours=2))
    assert res.json()["code"] == "unit_not_offered"
    # Only farmers book.
    assert _book(owner, eq["id"], BASE, BASE + timedelta(hours=1)).status_code == 403


def test_overlap_check(rental, make_actor):
    owner, _, farmer, eq = rental
    other_farmer = make_actor("farmer", "Sunita")
    first = _book(farmer, eq["id"], BASE, BASE + timedelta(hours=4)).json()
    # Any overlap with a requested booking is refused.
    for start, hours in ((BASE + timedelta(hours=1), 1), (BASE - timedelta(hours=1), 2), (BASE, 4)):
        res = _book(other_farmer, eq["id"], start, start + timedelta(hours=hours))
        assert res.status_code == 409 and res.json()["code"] == "booking_clash"
    # Touching ends are fine.
    assert (
        _book(
            other_farmer, eq["id"], BASE + timedelta(hours=4), BASE + timedelta(hours=6)
        ).status_code
        == 201
    )
    assert _book(other_farmer, eq["id"], BASE - timedelta(hours=2), BASE).status_code == 201
    # Also blocked by accepted bookings; freed by rejection/cancellation.
    owner.post(f"/api/bookings/{first['id']}/accept")
    assert _book(other_farmer, eq["id"], BASE, BASE + timedelta(hours=1)).status_code == 409
    farmer.post(f"/api/bookings/{first['id']}/cancel")
    assert _book(other_farmer, eq["id"], BASE, BASE + timedelta(hours=1)).status_code == 201


def test_busy_slots_hide_farmer_details(rental):
    _, _, farmer, eq = rental
    _book(farmer, eq["id"], BASE, BASE + timedelta(hours=2))
    res = farmer.get(
        f"/api/equipment/{eq['id']}/busy",
        params={"from": iso(BASE - timedelta(days=1)), "to": iso(BASE + timedelta(days=1))},
    )
    assert res.status_code == 200
    assert res.json() == [
        {
            "start_at": BASE.isoformat().replace("+00:00", "Z"),
            "end_at": (BASE + timedelta(hours=2)).isoformat().replace("+00:00", "Z"),
            "status": "requested",
        }
    ]


def test_lifecycle_notifications_and_ledger(rental, monkeypatch):
    owner, other_owner, farmer, eq = rental
    b = _book(farmer, eq["id"], BASE, BASE + timedelta(hours=2)).json()
    assert owner.get("/api/notifications").json()["items"][0]["type"] == "booking_requested"
    assert farmer.post(f"/api/bookings/{b['id']}/accept").status_code == 403
    assert other_owner.post(f"/api/bookings/{b['id']}/accept").status_code == 404
    res = owner.post(f"/api/bookings/{b['id']}/accept")
    assert res.json()["status"] == "accepted"
    assert farmer.get("/api/notifications").json()["items"][0]["type"] == "booking_accepted"
    # Cannot complete before the start.
    res = owner.post(f"/api/bookings/{b['id']}/complete")
    assert res.status_code == 409 and res.json()["code"] == "booking_not_started"

    later = BASE + timedelta(hours=3)
    monkeypatch.setattr(booking_service, "utcnow", lambda: later)
    res = farmer.post(f"/api/bookings/{b['id']}/cancel")
    assert res.status_code == 409 and res.json()["code"] == "booking_started"
    res = owner.post(f"/api/bookings/{b['id']}/complete")
    assert res.status_code == 200 and res.json()["status"] == "completed"
    assert owner.post(f"/api/bookings/{b['id']}/complete").status_code == 409

    ledger = farmer.get("/api/ledger").json()["items"]
    assert len(ledger) == 1
    assert (ledger[0]["booking_id"], ledger[0]["amount_inr"]) == (b["id"], 1800.0)
    assert ledger[0]["category"] == "equipment_rental"


def test_reject_and_cancel(rental):
    owner, _, farmer, eq = rental
    b1 = _book(farmer, eq["id"], BASE, BASE + timedelta(hours=1)).json()
    b2 = _book(farmer, eq["id"], BASE + timedelta(hours=2), BASE + timedelta(hours=3)).json()
    res = owner.post(f"/api/bookings/{b1['id']}/reject", {"reason": "Tractor under repair"})
    assert (
        res.json()["status"] == "rejected" and res.json()["status_reason"] == "Tractor under repair"
    )
    assert owner.post(f"/api/bookings/{b1['id']}/accept").status_code == 409
    assert owner.post(f"/api/bookings/{b2['id']}/cancel").status_code == 403
    assert farmer.post(f"/api/bookings/{b2['id']}/cancel").json()["status"] == "cancelled"
    assert owner.get("/api/notifications").json()["items"][0]["type"] == "booking_cancelled"


def test_listing_scopes_and_calendar_window(rental, make_actor, admin):
    owner, other_owner, farmer, eq = rental
    _book(farmer, eq["id"], BASE, BASE + timedelta(hours=1))
    _book(farmer, eq["id"], BASE + timedelta(days=40), BASE + timedelta(days=41), "day")
    assert farmer.get("/api/bookings").json()["total"] == 2
    assert owner.get("/api/bookings").json()["total"] == 2
    assert other_owner.get("/api/bookings").json()["total"] == 0
    assert admin.get("/api/bookings").json()["total"] == 2
    window = {"from": iso(BASE - timedelta(days=1)), "to": iso(BASE + timedelta(days=20))}
    assert owner.get("/api/bookings", params=window).json()["total"] == 1
    too_long = {"from": iso(BASE), "to": iso(BASE + timedelta(days=90))}
    assert owner.get("/api/bookings", params=too_long).status_code == 422
    assert make_actor("expert").get("/api/bookings").status_code == 403
    # The owner sees the farmer's phone; the farmer does not see other people's data.
    assert owner.get("/api/bookings").json()["items"][0]["farmer_phone"] == farmer.phone


def test_state_machine_table_and_units():
    assert {k: (sorted(v.sources), v.target, v.actor) for k, v in TRANSITIONS.items()} == {
        "accept": (["requested"], "accepted", "owner"),
        "reject": (["requested"], "rejected", "owner"),
        "complete": (["accepted"], "completed", "owner"),
        "cancel": (["accepted", "requested"], "cancelled", "farmer"),
    }
    assert booking_units(RentalUnit.day, BASE, BASE + timedelta(days=3)) == 3
    with pytest.raises(ApiError):
        booking_units(RentalUnit.hour, BASE, BASE + timedelta(seconds=3600.5))


def test_concurrent_bookings_cannot_both_succeed(tmp_path):
    """Two sessions on a real SQLite file race for the same slot: exactly one wins."""
    settings = Settings(_env_file=None, database_url=f"sqlite:///{tmp_path / 'race.db'}")
    database = Database(settings.database_url)
    database.create_all()
    with database.session_factory() as db:
        owner = User(
            name="Owner",
            phone="9811999001",
            password_hash="x",
            role=UserRole.hardware_vendor,
            status=UserStatus.approved,
        )
        farmers = [
            User(
                name=f"Farmer {i}",
                phone=f"981199910{i}",
                password_hash="x",
                role=UserRole.farmer,
                status=UserStatus.approved,
            )
            for i in range(6)
        ]
        db.add_all([owner, *farmers])
        db.flush()
        eq = Equipment(owner_id=owner.id, name="Tractor", type="tractor", rate_per_hour_inr=900)
        db.add(eq)
        db.commit()
        eq_id, farmer_ids = eq.id, [f.id for f in farmers]

    results: list[str] = []
    barrier = threading.Barrier(len(farmer_ids))

    def attempt(farmer_id: int) -> None:
        with database.session_factory() as db:
            farmer = db.get(User, farmer_id)
            data = BookingIn(
                equipment_id=eq_id, unit="hour", start_at=BASE, end_at=BASE + timedelta(hours=2)
            )
            barrier.wait()
            try:
                create_booking(db, farmer, data)
                results.append("ok")
            except ApiError as exc:
                results.append(exc.code)

    threads = [threading.Thread(target=attempt, args=(fid,)) for fid in farmer_ids]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert results.count("ok") == 1, results
    assert results.count("booking_clash") == len(farmer_ids) - 1
    with database.session_factory() as db:
        assert len(db.scalars(select(Booking)).all()) == 1
    database.engine.dispose()
