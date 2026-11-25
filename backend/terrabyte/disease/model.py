"""Load the exported disease model (``backend/models/disease``) and classify one leaf photo.

Decision rules (thresholds come from the validation split, see ``ml/reports``):

1. Photo quality: nearly blank, very dark, washed-out or very blurry photos are rejected with a
   request to retake them.
2. Gate: the temperature-scaled probability of the ``other`` class (not a supported leaf) above
   ``tau_reject`` rejects the photo.
3. The logits are masked to the crop the farmer selected. If the photo looks much more like
   another crop, or the top probability is below ``tau_confident``, the result is *uncertain*
   (top-3 shown, ask an expert); otherwise *confident*.
"""

from __future__ import annotations

import json
import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

OTHER = "other"
CROP_MASS_MIN = 0.3  # share of non-"other" probability on the selected crop's classes

Runner = Callable[[np.ndarray], np.ndarray]


@dataclass
class Candidate:
    class_id: str
    condition: str
    probability: float


@dataclass
class Prediction:
    status: str  # confident | uncertain | rejected
    reason: str | None
    crop: str
    top3: list[Candidate] = field(default_factory=list)
    p_other: float | None = None
    crop_mass: float | None = None


def _softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()


def quality_problem(img: Image.Image) -> str | None:
    """Return a reason code if the photo is unusable, else None."""
    gray = np.asarray(img.convert("L").resize((256, 256)), dtype=np.float32)
    mean, std = float(gray.mean()), float(gray.std())
    if std < 6:
        return "blank_image"
    if mean < 25:
        return "too_dark"
    if mean > 240 and std < 25:
        return "overexposed"
    lap = (
        -4 * gray[1:-1, 1:-1] + gray[:-2, 1:-1] + gray[2:, 1:-1] + gray[1:-1, :-2] + gray[1:-1, 2:]
    )
    if float(lap.var()) < 4:
        return "too_blurry"
    return None


class DiseaseModel:
    def __init__(self, meta: dict, runner: Runner) -> None:
        self.meta = meta
        self.version: str = meta["version"]
        self.classes: list[str] = [c["id"] for c in meta["classes"]]
        self.conditions = {c["id"]: c["condition"] for c in meta["classes"]}
        self.crops: dict[str, str] = meta["crops"]
        self.t = float(meta["temperature"])
        self.tau_reject = float(meta["tau_reject"])
        self.tau_confident = float(meta["tau_confident"])
        self.other = self.classes.index(OTHER)
        self.crop_idx: dict[str, list[int]] = {}
        for i, c in enumerate(meta["classes"]):
            if c["id"] != OTHER:
                self.crop_idx.setdefault(c["crop"], []).append(i)
        inp = meta["input"]
        self.size = int(inp["size"])
        self.resize = int(inp["resize_short_side"])
        self.mean = np.array(inp["mean"], dtype=np.float32).reshape(3, 1, 1)
        self.std = np.array(inp["std"], dtype=np.float32).reshape(3, 1, 1)
        self._run = runner

    def preprocess(self, img: Image.Image) -> np.ndarray:
        img = img.convert("RGB")
        w, h = img.size
        scale = self.resize / min(w, h)
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.BILINEAR)
        w, h = img.size
        left, top = (w - self.size) // 2, (h - self.size) // 2
        img = img.crop((left, top, left + self.size, top + self.size))
        arr = np.asarray(img, dtype=np.float32).transpose(2, 0, 1) / 255.0
        arr = (arr - self.mean) / self.std
        return arr[None].astype(np.float32)

    def predict(self, img: Image.Image, crop: str) -> Prediction:
        if crop not in self.crop_idx:
            raise ValueError(f"unsupported crop {crop!r}")
        problem = quality_problem(img)
        if problem:
            return Prediction("rejected", problem, crop)
        logits = self._run(self.preprocess(img))[0].astype(np.float64)
        full = _softmax(logits / self.t)
        p_other = float(full[self.other])
        if p_other > self.tau_reject:
            return Prediction("rejected", "not_a_supported_leaf", crop, p_other=p_other)
        idx = self.crop_idx[crop]
        masked = _softmax(logits[idx] / self.t)
        order = np.argsort(-masked)[:3]
        top3 = [
            Candidate(
                self.classes[idx[j]],
                self.conditions[self.classes[idx[j]]],
                round(float(masked[j]), 4),
            )
            for j in order
        ]
        leaf_mass = max(1e-9, 1.0 - p_other)
        crop_mass = float(full[idx].sum() / leaf_mass)
        if crop_mass < CROP_MASS_MIN:
            status, reason = "uncertain", "looks_like_other_crop"
        elif top3[0].probability >= self.tau_confident:
            status, reason = "confident", None
        else:
            status, reason = "uncertain", "low_confidence"
        return Prediction(status, reason, crop, top3, round(p_other, 4), round(crop_mass, 4))


def _onnx_runner(path: Path) -> Runner:
    import onnxruntime as ort

    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    session = ort.InferenceSession(str(path), opts, providers=["CPUExecutionProvider"])
    lock = threading.Lock()

    def run(batch: np.ndarray) -> np.ndarray:
        with lock:
            return session.run(["logits"], {"image": batch})[0]

    return run


@lru_cache(maxsize=4)
def load_model(model_dir: Path) -> DiseaseModel | None:
    """The exported model, or None when the files are missing (feature then reports
    'model not installed')."""
    meta_file, onnx_file = model_dir / "model.json", model_dir / "model.onnx"
    if not (meta_file.is_file() and onnx_file.is_file()):
        return None
    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    return DiseaseModel(meta, _onnx_runner(onnx_file))
