from tests.conftest import auth_header, login, register


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_farmer_register_is_approved_and_returns_token(client):
    res = register(client, phone="+91 98765 43210")
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["requires_approval"] is False
    assert body["user"]["status"] == "approved"
    assert body["user"]["phone"] == "9876543210"
    assert "password" not in str(body["user"]).lower()
    me = client.get("/api/me", headers=auth_header(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["name"] == "Asha Pawar"


def test_login_with_phone_and_email(client):
    register(client, email="Asha@Example.com")
    assert login(client, "9876543210", "secret-pass-1").status_code == 200
    assert login(client, "asha@example.com", "secret-pass-1").status_code == 200


def test_wrong_password_and_unknown_user(client):
    register(client)
    for ident, pw in (("9876543210", "nope-nope-1"), ("9000099999", "whatever-1")):
        res = login(client, ident, pw)
        assert res.status_code == 401
        assert res.json()["code"] == "invalid_credentials"


def test_register_validation(client):
    assert register(client, phone="12345").status_code == 422
    assert register(client, phone="5876543210").status_code == 422  # must start with 6-9
    assert register(client, password="short").status_code == 422
    res = register(client, role="admin")
    assert res.status_code == 403
    assert res.json()["code"] == "role_not_allowed"


def test_duplicate_phone_and_email(client):
    assert register(client, email="a@example.com").status_code == 201
    res = register(client, email="b@example.com")
    assert res.status_code == 409 and res.json()["code"] == "phone_taken"
    res = register(client, phone="9876543211", email="A@example.com")
    assert res.status_code == 409 and res.json()["code"] == "email_taken"


def test_register_ignores_aadhaar_and_status_fields(client):
    res = register(
        client, aadhaar="123412341234", status="approved", role="vendor", phone="9876543299"
    )
    assert res.status_code == 201
    assert res.json()["user"]["status"] == "pending"
    assert "aadhaar" not in res.text


def test_me_requires_token(client):
    res = client.get("/api/me")
    assert res.status_code == 401
    assert res.json()["code"] == "not_authenticated"
    res = client.get("/api/me", headers=auth_header("garbage"))
    assert res.status_code == 401
    assert res.json()["code"] == "invalid_token"


def test_patch_me_and_password(client):
    token = register(client).json()["access_token"]
    h = auth_header(token)
    res = client.patch(
        "/api/me",
        headers=h,
        json={
            "preferred_language": "mr",
            "village": "Narayangaon",
            "lat": 19.12,
            "lon": 73.97,
        },
    )
    assert res.status_code == 200, res.text
    assert res.json()["preferred_language"] == "mr"
    assert res.json()["village"] == "Narayangaon"
    # role and status cannot be changed through /me
    res = client.patch("/api/me", headers=h, json={"role": "admin", "status": "approved"})
    assert res.status_code == 200
    assert res.json()["role"] == "farmer"
    assert client.patch("/api/me", headers=h, json={"lat": 51.5}).status_code == 422

    bad = client.post(
        "/api/me/password",
        headers=h,
        json={"current_password": "wrong-pass", "new_password": "another-pass-2"},
    )
    assert bad.status_code == 400
    ok = client.post(
        "/api/me/password",
        headers=h,
        json={"current_password": "secret-pass-1", "new_password": "another-pass-2"},
    )
    assert ok.status_code == 204
    assert login(client, "9876543210", "another-pass-2").status_code == 200


def test_ml_placeholders_return_503(client):
    for path in ("/api/disease/detect", "/api/price-forecast", "/api/fertilizer-recommendation"):
        res = client.post(path)
        assert res.status_code == 503
        assert res.json()["detail"] == "being rebuilt"


def test_error_responses_have_no_stack_trace(client):
    res = client.post(
        "/api/auth/login", content=b"{not json", headers={"Content-Type": "application/json"}
    )
    assert res.status_code == 422
    assert "Traceback" not in res.text


def test_profile_update_accepts_explicit_nulls_and_blanks(client):
    token = register(client, village="Narayangaon").json()["access_token"]
    h = auth_header(token)
    res = client.patch("/api/me", headers=h, json={"village": None, "district": "  ", "lat": None})
    assert res.status_code == 200, res.text
    assert res.json()["village"] is None and res.json()["district"] is None
    res = client.patch("/api/me", headers=h, json={"village": "x" * 121})
    assert res.status_code == 422
