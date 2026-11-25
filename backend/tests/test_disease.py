from __future__ import annotations

import io
import json

import numpy as np
import pytest
from PIL import Image
from sqlalchemy import select

from terrabyte.config import BACKEND_DIR
from terrabyte.disease.metrics import MODEL_NAME, load_metrics
from terrabyte.disease.model import DiseaseModel, load_model, quality_problem
from terrabyte.disease.treatments import banned_in, info_for, treatments
from terrabyte.models import Consultation, ModelEvaluation

CLASSES = [
    ("grape__downy_mildew", "grape", "downy_mildew"),
    ("grape__healthy", "grape", "healthy"),
    ("tomato__early_blight", "tomato", "early_blight"),
    ("tomato__healthy", "tomato", "healthy"),
    ("other", None, "other"),
]
META = {
    "version": "test-v1",
    "classes": [{"id": i, "crop": c, "condition": d} for i, c, d in CLASSES],
    "crops": {"grape": "Grape", "tomato": "Tomato"},
    "temperature": 1.0,
    "tau_reject": 0.5,
    "tau_confident": 0.8,
    "input": {
        "size": 224,
        "resize_short_side": 256,
        "mean": [0.485, 0.456, 0.406],
        "std": [0.229, 0.224, 0.225],
    },
    "licence": "CC-BY-4.0",
}


class FakeRunner:
    def __init__(self, logits: list[float]) -> None:
        self.logits = np.array([logits], dtype=np.float32)
        self.calls = 0

    def __call__(self, batch: np.ndarray) -> np.ndarray:
        assert batch.shape == (1, 3, 224, 224) and batch.dtype == np.float32
        self.calls += 1
        return self.logits


def leafy_image(seed: int = 0) -> Image.Image:
    rng = np.random.default_rng(seed)
    arr = np.zeros((300, 400, 3), dtype=np.uint8)
    arr[..., 1] = rng.integers(80, 200, (300, 400))
    arr[..., 0] = rng.integers(20, 90, (300, 400))
    return Image.fromarray(arr)


def jpeg_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ---- model logic --------------------------------------------------------------------------------


def test_quality_gate_rejects_blank_and_dark_images_without_running_the_model():
    runner = FakeRunner([0, 0, 9, 0, 0])
    model = DiseaseModel(META, runner)
    white = model.predict(Image.new("RGB", (500, 400), (255, 255, 255)), "tomato")
    assert white.status == "rejected" and white.reason == "blank_image"
    assert quality_problem(Image.new("RGB", (100, 100), (5, 5, 5))) == "blank_image"
    assert quality_problem(leafy_image()) is None
    assert runner.calls == 0


def test_gate_rejects_when_other_class_dominates():
    model = DiseaseModel(META, FakeRunner([0, 0, 0, 0, 6]))
    res = model.predict(leafy_image(), "tomato")
    assert res.status == "rejected" and res.reason == "not_a_supported_leaf"
    assert res.p_other > 0.5


def test_confident_and_uncertain_results_are_crop_masked():
    confident = DiseaseModel(META, FakeRunner([0, 0, 6, 1, -3])).predict(leafy_image(), "tomato")
    assert confident.status == "confident"
    assert [c.class_id for c in confident.top3] == ["tomato__early_blight", "tomato__healthy"]
    unsure = DiseaseModel(META, FakeRunner([0, 0, 1, 0.6, -3])).predict(leafy_image(), "tomato")
    assert unsure.status == "uncertain" and unsure.reason == "low_confidence"
    # The photo looks like a grape leaf although the farmer picked tomato.
    other_crop = DiseaseModel(META, FakeRunner([7, 0, 1, 0, -3])).predict(leafy_image(), "tomato")
    assert other_crop.status == "uncertain" and other_crop.reason == "looks_like_other_crop"


def test_unknown_crop_is_an_error():
    with pytest.raises(ValueError):
        DiseaseModel(META, FakeRunner([0] * 5)).predict(leafy_image(), "banana")


# ---- curated treatments -------------------------------------------------------------------------


def test_treatment_table_has_no_banned_chemicals_and_cites_sources():
    data = treatments()
    banned = data["banned_active_ingredients"]
    assert banned_in("Streptomycin sulphate + Tetracycline", banned)
    assert banned_in("Dinocap", banned)
    assert not banned_in("Mancozeb", banned)
    for class_id, entry in data["classes"].items():
        assert entry["sources"], class_id
        assert all(s["url"].startswith("https://") for s in entry["sources"])
        for c in entry["chemical"]:
            assert not banned_in(c["active_ingredient"], banned), (class_id, c)
            assert c["source"]["url"].startswith("https://www.niphm.gov.in/")
        if entry["type"] in ("viral", "healthy", "nutrient", "unknown"):
            assert entry["chemical"] == [], class_id


def test_treatments_cover_every_class_of_the_installed_model():
    meta_file = BACKEND_DIR / "models" / "disease" / "model.json"
    if not meta_file.exists():
        pytest.skip("disease model not installed")
    meta = json.loads(meta_file.read_text())
    ids = {c["id"] for c in meta["classes"]} - {"other"}
    assert ids == set(treatments()["classes"])


def test_chemicals_only_on_request():
    with_chem = info_for("tomato__early_blight", include_chemical=True)
    without = info_for("tomato__early_blight", include_chemical=False)
    assert with_chem["chemical"] and with_chem["chemical_note"].startswith("Guidance only")
    assert without["chemical"] == [] and without["chemical_withheld"] is True
    assert info_for("tomato__mosaic_virus", include_chemical=True)["chemical"] == []
    assert info_for("not_a_class", include_chemical=True) is None


# ---- API ----------------------------------------------------------------------------------------


@pytest.fixture
def fake_model(client):
    runner = FakeRunner([0, 0, 6, 1, -3])
    client.app.state.disease_model = DiseaseModel(META, runner)
    yield runner
    client.app.state.disease_model = None


def _upload(actor, crop="tomato", img=None):
    data = jpeg_bytes(img or leafy_image())
    return actor.client.post(
        "/api/disease/checks",
        headers=actor.h,
        files={"file": ("leaf.jpg", data, "image/jpeg")},
        data={"crop": crop},
    )


def test_disease_check_flow(client, make_actor, fake_model):
    farmer = make_actor("farmer")
    make_actor("expert")
    info = farmer.get("/api/disease/model").json()
    assert info["available"] and {c["id"] for c in info["crops"]} == {"grape", "tomato"}

    res = _upload(farmer)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "confident"
    top = body["top3"][0]
    assert top["class_id"] == "tomato__early_blight" and top["info"]["chemical"]
    assert body["top3"][1]["info"]["chemical"] == []  # never for lower-ranked candidates
    assert body["image_url"].startswith(f"/api/files/images/u{farmer.id}/")

    white = _upload(farmer, img=Image.new("RGB", (300, 300), (255, 255, 255))).json()
    assert white["status"] == "rejected" and white["top3"] == []

    hist = farmer.get("/api/disease/checks").json()
    assert hist["total"] == 2 and hist["items"][0]["id"] == white["id"]

    asked = farmer.post(f"/api/disease/checks/{body['id']}/ask-expert", json={"note": "Spots"})
    assert asked.status_code == 200, asked.text
    cid = asked.json()["consultation_id"]
    with client.app.state.db.session_factory() as db:
        consultation = db.scalar(select(Consultation).where(Consultation.id == cid))
        assert consultation.category == "disease" and consultation.crop == "tomato"
        assert "early_blight" in consultation.question and "Spots" in consultation.question
        assert consultation.image_path in body["image_url"]
    again = farmer.post(f"/api/disease/checks/{body['id']}/ask-expert", json={})
    assert again.status_code == 409

    other = make_actor("farmer")
    assert other.get(f"/api/disease/checks/{body['id']}").status_code == 404
    assert other.get("/api/disease/checks").json()["total"] == 0


def test_disease_check_validation(client, make_actor, fake_model):
    farmer = make_actor("farmer")
    assert _upload(farmer, crop="banana").status_code == 422
    bad = farmer.client.post(
        "/api/disease/checks",
        headers=farmer.h,
        files={"file": ("x.txt", b"hello", "text/plain")},
        data={"crop": "tomato"},
    )
    assert bad.status_code == 415
    vendor = make_actor("vendor")
    assert _upload(vendor).status_code == 403


def test_missing_model_reports_unavailable(client, make_actor, tmp_path):
    client.app.state.settings.disease_model_dir = tmp_path / "none"
    farmer = make_actor("farmer")
    assert farmer.get("/api/disease/model").json() == {
        "available": False,
        "version": None,
        "crops": [],
        "licence": None,
    }
    assert _upload(farmer).status_code == 503


def test_real_model_rejects_blank_and_noise_if_installed():
    model = load_model(BACKEND_DIR / "models" / "disease")
    if model is None:
        pytest.skip("disease model not installed")
    for crop in model.crop_idx:
        assert model.predict(Image.new("RGB", (640, 480), (255, 255, 255)), crop).status == (
            "rejected"
        )
    noise = Image.fromarray(np.random.default_rng(1).integers(0, 256, (480, 640, 3), np.uint8))
    assert model.predict(noise, "tomato").status == "rejected"


def test_load_model_metrics(client):
    meta = {
        "version": "v-test",
        "evaluation": {
            "evaluated_on": "2026-11-25",
            "in_domain_test": {"tomato": {"n": 10, "top1": 90.0, "top3": 100.0, "ece": 0.05}},
            "cross_source_test": {
                "plantdoc_test: tomato": {"n": 5, "top1": 40.0, "top3": 80.0, "ece": 0.2}
            },
            "ood": {"banana_leaf": {"n": 7, "rejected": 85.7}},
        },
    }
    with client.app.state.db.session_factory() as db:
        assert load_metrics(db, meta) == 7
        assert load_metrics(db, meta) == 7  # replaces, does not duplicate
        rows = db.scalars(select(ModelEvaluation).where(ModelEvaluation.model_name == MODEL_NAME))
        assert len(list(rows)) == 7
