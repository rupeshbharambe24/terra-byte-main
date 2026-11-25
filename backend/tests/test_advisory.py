import json

import pytest

from terrabyte.kvk_import import import_kvks, load_rows
from terrabyte.kvk_import import main as import_main
from terrabyte.models import KVK, DataImport

QUESTION = {
    "crop": "Onion",
    "category": "nutrient",
    "question": "Leaf tips are turning yellow. What should I check?",
}


@pytest.fixture
def people(make_actor):
    return (
        make_actor("farmer", "Ramesh"),
        make_actor("farmer", "Sunita"),
        make_actor("expert", "Dr. Patil"),
        make_actor("expert", "Dr. Kulkarni"),
    )


def test_consultation_thread_end_to_end(people):
    farmer, _, expert, _ = people
    res = farmer.post("/api/consultations", QUESTION)
    assert res.status_code == 201, res.text
    c = res.json()
    assert c["status"] == "open" and c["expert_id"] is None
    assert expert.get("/api/notifications").json()["items"][0]["type"] == "consultation_new"

    # Experts see unassigned questions; replying requires claiming first.
    assert expert.get("/api/consultations", params={"scope": "open"}).json()["total"] == 1
    res = expert.post(f"/api/consultations/{c['id']}/messages", {"body": "Hello"})
    assert res.status_code == 409 and res.json()["code"] == "not_assigned"
    res = expert.post(f"/api/consultations/{c['id']}/claim")
    assert res.json()["status"] == "assigned" and res.json()["expert_name"] == "Dr. Patil"

    res = expert.post(f"/api/consultations/{c['id']}/messages", {"body": "Send a photo please."})
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "answered" and body["first_response_at"]
    assert body["messages"][0]["author_role"] == "expert"

    # The farmer sees the reply and a notification; a follow-up puts it back with the expert.
    thread = farmer.get(f"/api/consultations/{c['id']}").json()
    assert thread["messages"][0]["body"] == "Send a photo please."
    types = {n["type"] for n in farmer.get("/api/notifications").json()["items"]}
    assert {"consultation_assigned", "consultation_message"} <= types
    res = farmer.post(f"/api/consultations/{c['id']}/messages", {"body": "Photo attached."})
    assert res.json()["status"] == "assigned"
    assert expert.get("/api/notifications").json()["items"][0]["type"] == "consultation_message"

    res = expert.post(f"/api/consultations/{c['id']}/status", {"status": "closed"})
    assert res.json()["status"] == "closed" and res.json()["closed_at"]
    res = farmer.post(f"/api/consultations/{c['id']}/messages", {"body": "One more"})
    assert res.status_code == 409 and res.json()["code"] == "consultation_closed"


def test_claim_is_exclusive_and_visibility(people, admin):
    farmer, other_farmer, expert, other_expert = people
    cid = farmer.post("/api/consultations", QUESTION).json()["id"]
    assert expert.post(f"/api/consultations/{cid}/claim").status_code == 200
    res = other_expert.post(f"/api/consultations/{cid}/claim")
    assert res.status_code == 404  # no longer visible to other experts
    assert other_expert.get(f"/api/consultations/{cid}").status_code == 404
    assert other_farmer.get(f"/api/consultations/{cid}").status_code == 404
    assert other_farmer.get("/api/consultations").json()["total"] == 0
    assert expert.get("/api/consultations", params={"scope": "mine"}).json()["total"] == 1
    assert admin.get(f"/api/consultations/{cid}").status_code == 200
    # Admins and farmers cannot claim; farmers cannot mark answered.
    assert farmer.post(f"/api/consultations/{cid}/claim").status_code == 403
    res = farmer.post(f"/api/consultations/{cid}/status", {"status": "answered"})
    assert res.status_code == 403
    assert admin.post(f"/api/consultations/{cid}/messages", {"body": "hi"}).status_code == 403


def test_admin_reassigns(people, admin):
    farmer, _, expert, other_expert = people
    cid = farmer.post("/api/consultations", QUESTION).json()["id"]
    expert.post(f"/api/consultations/{cid}/claim")
    res = admin.post(f"/api/admin/consultations/{cid}/assign", {"expert_id": other_expert.id})
    assert res.status_code == 200 and res.json()["expert_id"] == other_expert.id
    assert other_expert.get(f"/api/consultations/{cid}").status_code == 200
    assert expert.get(f"/api/consultations/{cid}").status_code == 404
    assert expert.get("/api/notifications").json()["items"][0]["type"] == "consultation_reassigned"
    res = admin.post(f"/api/admin/consultations/{cid}/assign", {"expert_id": farmer.id})
    assert res.status_code == 422
    assert (
        expert.post(f"/api/admin/consultations/{cid}/assign", {"expert_id": 1}).status_code == 403
    )


def test_question_validation_and_kvk(people, admin):
    farmer, _, _, _ = people
    assert farmer.post("/api/consultations", {**QUESTION, "question": "short"}).status_code == 422
    assert farmer.post("/api/consultations", {**QUESTION, "category": "x"}).status_code == 422
    assert farmer.post("/api/consultations", {**QUESTION, "kvk_id": 99}).status_code == 422
    res = farmer.post(
        "/api/consultations", {**QUESTION, "image_path": "images/u1/" + "b" * 32 + ".jpg"}
    )
    assert res.status_code == 422 and res.json()["code"] == "invalid_image_path"
    kvk = admin.post(
        "/api/admin/kvks", {"name": "KVK Narayangaon", "district": "Pune", "state": "Maharashtra"}
    ).json()
    res = farmer.post("/api/consultations", {**QUESTION, "kvk_id": kvk["id"]})
    assert res.json()["kvk_name"] == "KVK Narayangaon"
    assert admin.get("/api/consultations", params={"kvk_id": kvk["id"]}).json()["total"] == 1


def test_kvk_admin_crud_and_permissions(people, admin):
    farmer, _, expert, _ = people
    assert farmer.get("/api/kvks").json()["total"] == 0
    payload = {"name": "KVK Baramati", "district": "Pune", "state": "Maharashtra"}
    assert farmer.post("/api/admin/kvks", payload).status_code == 403
    kvk = admin.post("/api/admin/kvks", {**payload, "pincode": "413 115"}).json()
    assert kvk["pincode"] == "413115"
    res = admin.patch(f"/api/admin/kvks/{kvk['id']}", {"phone": "02112-255227"})
    assert res.json()["phone"] == "02112-255227"
    assert admin.patch(f"/api/admin/kvks/{kvk['id']}", {"name": None}).status_code == 422
    assert admin.post("/api/admin/kvks", {**payload, "pincode": "12"}).status_code == 422
    assert expert.get("/api/kvks", params={"district": "pune"}).json()["total"] == 1
    cid = farmer.post("/api/consultations", {**QUESTION, "kvk_id": kvk["id"]}).json()["id"]
    assert admin.delete(f"/api/admin/kvks/{kvk['id']}").status_code == 204
    assert farmer.get(f"/api/consultations/{cid}").json()["kvk_id"] is None


def test_kvk_import(client, admin, tmp_path, monkeypatch, settings):
    rows = [
        {
            "name": "KVK Narayangaon",
            "district": "Pune",
            "state": "Maharashtra",
            "host_organisation": "Example trust",
            "pincode": 410504,
            "website": "https://example.org/kvk",
            "lat": 19.1,
            "lon": 73.97,
            "source_url": "https://example.org/list",
            "verified_on": "2026-11-20",
            "unknown_field": "ignored",
        },
        {"name": "KVK X"},  # missing district/state
        {"name": "KVK Narayangaon", "district": "pune", "state": "Maharashtra"},  # duplicate
        {"name": "KVK Bad", "district": "Pune", "state": "Maharashtra", "lat": 200},
    ]
    with client.app.state.db.session_factory() as db:
        dry = import_kvks(db, load_rows(rows), "kvk.json", dry_run=True)
        assert (dry.created, db.query(KVK).count()) == (1, 0)
        result = import_kvks(db, load_rows({"kvks": rows}), "kvk.json")
        assert (result.created, result.updated, result.skipped) == (1, 0, 3)
        assert len(result.errors) == 3
        again = import_kvks(db, [{**rows[0], "phone": "1234"}], "kvk-v2.json")
        assert (again.created, again.updated) == (0, 1)
        assert db.query(KVK).one().phone == "1234"
        assert db.query(DataImport).count() == 2

    status = admin.get("/api/admin/kvk-status").json()
    assert status["total"] == 1 and status["verified"] == 1
    assert status["districts"] == ["Pune"] and status["imports"][0]["source"] == "kvk-v2.json"
    assert status["imports"][1]["skipped"] == 3

    # The command-line entry point reads a file and exits non-zero on unreadable input.
    path = tmp_path / "kvks.json"
    path.write_text(json.dumps(rows[:1]))
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'cli.db'}")
    from terrabyte.config import get_settings

    get_settings.cache_clear()
    try:
        with pytest.raises(SystemExit) as exit_info:
            import_main([str(path)])
        assert exit_info.value.code == 0
        bad = tmp_path / "bad.json"
        bad.write_text('{"not": "a list"}')
        with pytest.raises(SystemExit) as exit_info:
            import_main([str(bad)])
        assert exit_info.value.code == 2
    finally:
        get_settings.cache_clear()


def test_knowledge_articles(people, admin):
    farmer, _, expert, other_expert = people
    article = {"title": "Asking good questions", "body": "Include the crop, stage and photos."}
    assert farmer.post("/api/expert/articles", article).status_code == 403
    draft = expert.post("/api/expert/articles", article).json()
    assert draft["published"] is False and draft["published_at"] is None
    assert farmer.get("/api/articles").json()["total"] == 0
    assert farmer.get(f"/api/articles/{draft['id']}").status_code == 404
    assert (
        other_expert.patch(f"/api/expert/articles/{draft['id']}", {"title": "x" * 6}).status_code
        == 404
    )

    pub = expert.patch(f"/api/expert/articles/{draft['id']}", {"published": True}).json()
    assert pub["published"] and pub["published_at"]
    listing = farmer.get("/api/articles", params={"q": "photos"}).json()
    assert listing["total"] == 1 and listing["items"][0]["author_name"] == "Dr. Patil"
    assert expert.get("/api/expert/articles").json()["total"] == 1
    assert expert.delete(f"/api/expert/articles/{draft['id']}").status_code == 204
    assert farmer.get("/api/articles").json()["total"] == 0
