from tests.conftest import auth_header, login, register


def _pending_vendor(client):
    res = register(
        client,
        name="Krishi Seva",
        phone="9822000001",
        role="vendor",
        organization="Krishi Seva Kendra",
    )
    assert res.status_code == 201
    body = res.json()
    assert body["requires_approval"] is True
    assert body["access_token"] is None
    return body["user"]["id"]


def test_pending_vendor_cannot_login_until_approved(client, admin_token):
    vendor_id = _pending_vendor(client)
    res = login(client, "9822000001", "secret-pass-1")
    assert res.status_code == 403
    assert res.json()["code"] == "account_pending"

    res = client.post(f"/api/admin/users/{vendor_id}/approve", headers=auth_header(admin_token))
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "approved"

    res = login(client, "9822000001", "secret-pass-1")
    assert res.status_code == 200
    token = res.json()["access_token"]
    notes = client.get("/api/notifications", headers=auth_header(token)).json()
    assert notes["unread"] == 1
    assert notes["items"][0]["type"] == "account_approved"


def test_admin_is_notified_of_pending_registration(client, admin_token):
    _pending_vendor(client)
    notes = client.get("/api/notifications", headers=auth_header(admin_token)).json()
    assert any(n["type"] == "approval_requested" for n in notes["items"])


def test_farmer_cannot_use_admin_routes(client):
    token = register(client).json()["access_token"]
    res = client.get("/api/admin/users", headers=auth_header(token))
    assert res.status_code == 403
    assert res.json()["code"] == "forbidden"
    res = client.post("/api/admin/users/1/approve", headers=auth_header(token))
    assert res.status_code == 403


def test_admin_list_filters(client, admin_token):
    _pending_vendor(client)
    register(client)  # farmer
    h = auth_header(admin_token)
    all_users = client.get("/api/admin/users", headers=h).json()
    assert all_users["total"] == 3
    pending = client.get("/api/admin/users", headers=h, params={"status": "pending"}).json()
    assert [u["phone"] for u in pending["items"]] == ["9822000001"]
    farmers = client.get("/api/admin/users", headers=h, params={"role": "farmer"}).json()
    assert farmers["total"] == 1
    search = client.get("/api/admin/users", headers=h, params={"q": "krishi"}).json()
    assert search["total"] == 1


def test_reject_and_suspend_flow(client, admin_token):
    h = auth_header(admin_token)
    vendor_id = _pending_vendor(client)
    res = client.post(
        f"/api/admin/users/{vendor_id}/reject", headers=h, json={"reason": "Incomplete details"}
    )
    assert res.json()["status"] == "rejected"
    assert login(client, "9822000001", "secret-pass-1").json()["code"] == "account_rejected"

    # Suspending is only allowed for approved users
    res = client.post(f"/api/admin/users/{vendor_id}/suspend", headers=h)
    assert res.status_code == 409

    client.post(f"/api/admin/users/{vendor_id}/approve", headers=h)
    token = login(client, "9822000001", "secret-pass-1").json()["access_token"]
    client.post(f"/api/admin/users/{vendor_id}/suspend", headers=h)
    # An existing token stops working once the account is suspended
    res = client.get("/api/me", headers=auth_header(token))
    assert res.status_code == 403
    assert res.json()["code"] == "account_suspended"


def test_admin_accounts_cannot_be_modified(client, admin_token):
    h = auth_header(admin_token)
    admin_id = client.get("/api/me", headers=h).json()["id"]
    res = client.post(f"/api/admin/users/{admin_id}/suspend", headers=h)
    assert res.status_code == 403
    assert res.json()["code"] == "cannot_modify_admin"
