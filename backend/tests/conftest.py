from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from terrabyte.config import Settings
from terrabyte.main import create_app
from terrabyte.models import User, UserRole, UserStatus
from terrabyte.security import hash_password

ADMIN_PHONE = "9876500001"
ADMIN_PASSWORD = "admin-pass-123"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        database_url="sqlite://",
        jwt_secret="test-secret-" + "x" * 32,
        upload_dir=tmp_path / "uploads",
        cors_origins=["http://localhost:8080"],
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    app = create_app(settings)
    with TestClient(app) as c:
        with app.state.db.session_factory() as db:
            db.add(
                User(
                    name="Test Admin",
                    phone=ADMIN_PHONE,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role=UserRole.admin,
                    status=UserStatus.approved,
                )
            )
            db.commit()
        yield c


def register(client: TestClient, **overrides: object):
    payload = {
        "name": "Asha Pawar",
        "phone": "9876543210",
        "password": "secret-pass-1",
        "role": "farmer",
        "state": "Maharashtra",
        "district": "Pune",
    }
    payload.update(overrides)
    return client.post("/api/auth/register", json=payload)


def login(client: TestClient, identifier: str, password: str):
    return client.post("/api/auth/login", json={"identifier": identifier, "password": password})


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_token(client: TestClient) -> str:
    res = login(client, ADMIN_PHONE, ADMIN_PASSWORD)
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


class Actor:
    """An approved user created directly in the test database, with a ready auth header."""

    def __init__(self, client: TestClient, user_id: int, phone: str, password: str) -> None:
        self.client = client
        self.id = user_id
        self.phone = phone
        token = login(client, phone, password).json()["access_token"]
        self.h = auth_header(token)

    def get(self, url: str, **kw):
        return self.client.get(url, headers=self.h, **kw)

    def post(self, url: str, json: object | None = None, **kw):
        return self.client.post(url, headers=self.h, json=json, **kw)

    def patch(self, url: str, json: object | None = None, **kw):
        return self.client.patch(url, headers=self.h, json=json, **kw)

    def delete(self, url: str, **kw):
        return self.client.delete(url, headers=self.h, **kw)


@pytest.fixture
def make_actor(client: TestClient):
    counter = iter(range(100, 999))

    def _make(role: str, name: str | None = None, district: str = "Pune") -> Actor:
        phone = f"9811{next(counter):06d}"
        with client.app.state.db.session_factory() as db:
            user = User(
                name=name or f"Test {role}",
                phone=phone,
                password_hash=hash_password("actor-pass-123"),
                role=UserRole(role),
                status=UserStatus.approved,
                state="Maharashtra",
                district=district,
            )
            db.add(user)
            db.commit()
            user_id = user.id
        return Actor(client, user_id, phone, "actor-pass-123")

    return _make


@pytest.fixture
def admin(client: TestClient) -> Actor:
    with client.app.state.db.session_factory() as db:
        admin_id = db.query(User.id).filter(User.phone == ADMIN_PHONE).scalar()
    return Actor(client, admin_id, ADMIN_PHONE, ADMIN_PASSWORD)
