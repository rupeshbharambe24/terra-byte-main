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
