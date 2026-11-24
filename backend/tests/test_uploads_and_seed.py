import io

from PIL import Image

from terrabyte.models import Product, User, UserStatus
from terrabyte.seed import DEMO_USERS, seed
from tests.conftest import auth_header, register


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", (40, 30), (0, 128, 0, 255)).save(buf, format="PNG")
    return buf.getvalue()


def test_image_upload_reencodes(client, settings):
    token = register(client).json()["access_token"]
    res = client.post(
        "/api/uploads/image",
        headers=auth_header(token),
        files={"file": ("leaf.png", _png_bytes(), "image/png")},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["path"].endswith(".jpg") and (body["width"], body["height"]) == (40, 30)
    assert (settings.upload_dir / body["path"]).exists()


def test_upload_rejects_non_images_and_large_files(client, settings):
    h = auth_header(register(client).json()["access_token"])
    res = client.post(
        "/api/uploads/image", headers=h, files={"file": ("x.png", b"not an image", "image/png")}
    )
    assert res.status_code == 415
    res = client.post(
        "/api/uploads/image", headers=h, files={"file": ("x.txt", b"hello", "text/plain")}
    )
    assert res.status_code == 415
    big = b"0" * (settings.max_request_bytes + 10)
    res = client.post(
        "/api/uploads/image", headers=h, files={"file": ("big.png", big, "image/png")}
    )
    assert res.status_code == 413


def test_seed_is_idempotent(client):
    with client.app.state.db.session_factory() as db:
        first = seed(db)
        second = seed(db)
        assert first["users"] == len(DEMO_USERS)
        assert second == {"users": 0, "fields": 0, "products": 0, "equipment": 0}
        assert db.query(User).filter(User.status == UserStatus.pending).count() == 1
        assert db.query(Product).count() == first["products"] > 0


def test_catalog_lists_seeded_products(client):
    with client.app.state.db.session_factory() as db:
        seed(db)
    token = register(client).json()["access_token"]
    products = client.get("/api/products", headers=auth_header(token)).json()
    assert products["total"] > 0 and all(p["vendor_name"] for p in products["items"])
    equipment = client.get("/api/equipment", headers=auth_header(token)).json()
    assert equipment["total"] > 0
