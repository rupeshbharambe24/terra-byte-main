import pytest


@pytest.fixture
def forum(make_actor):
    return make_actor("farmer", "Ramesh"), make_actor("farmer", "Sunita"), make_actor("expert")


def _post(actor, **overrides):
    payload = {"title": "Rotavator sharing", "body": "Anyone nearby?", "category": "equipment"}
    payload.update(overrides)
    res = actor.post("/api/forum/posts", payload)
    assert res.status_code == 201, res.text
    return res.json()


def test_posts_replies_and_notifications(forum, make_actor):
    a, b, expert = forum
    post = _post(a)
    res = b.post(f"/api/forum/posts/{post['id']}/replies", {"body": "Too far for me."})
    assert res.status_code == 201 and res.json()["reply_count"] == 1
    assert a.get("/api/notifications").json()["items"][0]["type"] == "forum_reply"
    listing = expert.get("/api/forum/posts", params={"category": "equipment"}).json()
    assert listing["total"] == 1 and listing["items"][0]["author"]["name"] == "Ramesh"
    assert expert.get("/api/forum/posts", params={"q": "rotavator"}).json()["total"] == 1
    assert a.get("/api/forum/posts", params={"mine": True}).json()["total"] == 1
    assert b.get("/api/forum/posts", params={"mine": True}).json()["total"] == 0
    # Validation and roles
    assert a.post("/api/forum/posts", {"title": "Hi", "body": "x"}).status_code == 422
    assert a.post("/api/forum/posts", {"title": "Valid title", "body": "   "}).status_code == 422
    assert _post_status(a, category="nonsense") == 422
    vendor = make_actor("vendor")
    assert vendor.post("/api/forum/posts", {"title": "Buy now", "body": "x"}).status_code == 403


def _post_status(actor, **overrides):
    payload = {"title": "Valid title", "body": "Body", **overrides}
    return actor.post("/api/forum/posts", payload).status_code


def test_report_hide_restore_dismiss(forum, admin):
    a, b, _ = forum
    post = _post(b, title="Selling drip rolls", category="market")
    detail = a.post(f"/api/forum/posts/{post['id']}/replies", {"body": "Spam reply"}).json()
    reply_id = detail["replies"][0]["id"]

    # Reports: not your own content, not twice.
    assert b.post(f"/api/forum/posts/{post['id']}/report", {"reason": "mine"}).status_code == 400
    assert a.post(f"/api/forum/posts/{post['id']}/report", {"reason": "Advert"}).status_code == 204
    res = a.post(f"/api/forum/posts/{post['id']}/report", {"reason": "Advert"})
    assert res.status_code == 409 and res.json()["code"] == "already_reported"
    assert b.post(f"/api/forum/replies/{reply_id}/report", {"reason": "Rude"}).status_code == 204
    assert admin.get("/api/notifications").json()["items"][0]["type"] == "forum_report"

    reports = admin.get("/api/admin/forum/reports").json()
    assert reports["total"] == 2
    by_type = {r["target_type"]: r for r in reports["items"]}
    assert by_type["post"]["target_title"] == "Selling drip rolls"
    assert by_type["reply"]["post_id"] == post["id"]
    assert a.get("/api/admin/forum/reports").status_code == 403

    # Hiding the post resolves its report and hides it from everyone but admins.
    assert (
        admin.post(f"/api/admin/forum/posts/{post['id']}/hide", {"reason": "Advert"}).status_code
        == 204
    )
    assert a.get(f"/api/forum/posts/{post['id']}").status_code == 404
    assert a.get("/api/forum/posts").json()["total"] == 0
    assert admin.get(f"/api/forum/posts/{post['id']}").json()["moderation_status"] == "hidden"
    assert b.get("/api/notifications").json()["items"][0]["type"] == "forum_hidden"
    assert admin.post(f"/api/admin/forum/posts/{post['id']}/hide").status_code == 409
    assert a.post(f"/api/forum/posts/{post['id']}/replies", {"body": "x"}).status_code == 404
    open_reports = admin.get("/api/admin/forum/reports").json()
    assert [r["target_type"] for r in open_reports["items"]] == ["reply"]

    # Dismiss the reply report; restore the post.
    report_id = open_reports["items"][0]["id"]
    assert admin.post(f"/api/admin/forum/reports/{report_id}/dismiss").status_code == 204
    assert admin.post(f"/api/admin/forum/reports/{report_id}/dismiss").status_code == 409
    assert admin.get("/api/admin/forum/reports").json()["total"] == 0
    resolved = admin.get("/api/admin/forum/reports", params={"status": "resolved"}).json()
    assert resolved["total"] == 1
    assert admin.post(f"/api/admin/forum/posts/{post['id']}/restore").status_code == 204
    assert a.get(f"/api/forum/posts/{post['id']}").status_code == 200


def test_hidden_reply_is_invisible_to_non_admins(forum, admin):
    a, b, _ = forum
    post = _post(a)
    detail = b.post(f"/api/forum/posts/{post['id']}/replies", {"body": "Rude reply"}).json()
    rid = detail["replies"][0]["id"]
    assert admin.post(f"/api/admin/forum/replies/{rid}/hide").status_code == 204
    view = a.get(f"/api/forum/posts/{post['id']}").json()
    assert view["replies"] == [] and view["reply_count"] == 0
    assert len(admin.get(f"/api/forum/posts/{post['id']}").json()["replies"]) == 1
    assert a.post(f"/api/forum/replies/{rid}/report", {"reason": "x" * 5}).status_code == 404
    assert admin.post(f"/api/admin/forum/replies/{rid}/restore").status_code == 204
    assert a.get(f"/api/forum/posts/{post['id']}").json()["reply_count"] == 1


def test_authors_delete_own_content_only(forum):
    a, b, _ = forum
    post = _post(a)
    assert b.delete(f"/api/forum/posts/{post['id']}").status_code == 403
    assert a.delete(f"/api/forum/posts/{post['id']}").status_code == 204
    assert b.get(f"/api/forum/posts/{post['id']}").status_code == 404
