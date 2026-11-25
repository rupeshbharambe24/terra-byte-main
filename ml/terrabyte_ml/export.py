"""Export the trained model to ONNX with its metadata and model card, ready for the backend.

Writes to ``ml/export/disease_v1/`` and copies the files to ``backend/models/disease/``:
``model.onnx`` (fp32, input ``image`` [N,3,224,224] normalised RGB, output ``logits``),
``model.json`` (version, classes, temperature, thresholds, preprocessing, evaluation summary)
and ``MODEL_CARD.md`` (datasets, licences, limitations).
"""

from __future__ import annotations

import json
import shutil

import numpy as np
import onnxruntime as ort
import torch

from . import taxonomy as tx
from .data import IMG_SIZE, MEAN, RESIZE, STD
from .evaluate import VERSION
from .paths import EXPORT, ML_ROOT, REPORTS
from .sources import SOURCES
from .train import BACKBONE, RUN, build_model

BACKEND_MODEL_DIR = ML_ROOT.parent / "backend" / "models" / "disease"


def model_card(meta: dict) -> str:
    rows = [
        f"| {s.title} | {s.url} | {s.licence} | {'evaluation only' if s.eval_only else 'training'} |"
        for s in SOURCES
    ]
    return (
        "\n".join(
            [
                f"# Model card: TerraByte crop disease model `{meta['version']}`",
                "",
                "Image classifier for leaf photos of the crops listed in `model.json`. The farmer picks "
                "the crop; the app masks the output to that crop's classes. Photos that do not look "
                "like a supported leaf are rejected. Results are **guidance only**, not a diagnosis.",
                "",
                f"- Architecture: MobileNetV3-Large 1.0 (timm `{BACKBONE}`), fine-tuned, 224 px input.",
                "- Training code and evaluation: `ml/` in this repository (`uv run tbml ...`).",
                "- Evaluation report: `ml/reports/disease_model_v1.md`.",
                "",
                "## Licence of these weights",
                "",
                "The code in this repository is MIT. These **weights** are released under "
                "**CC BY 4.0**, with attribution to the datasets below (all training data is CC0 or "
                "CC BY 4.0; PlantVillage was used through the CC0 derivative by Geetharamani & Pandian). "
                "The backbone was pretrained on ImageNet (timm weights, Apache-2.0); ImageNet's terms "
                "restrict the images to non-commercial research, and whether that carries over to "
                "fine-tuned weights is not settled.",
                "",
                "## Datasets",
                "",
                "| dataset | URL | licence | use |",
                "|---|---|---|---|",
                *rows,
                "",
                "## Limitations",
                "",
                "- Trained mostly on single-location datasets; expect lower accuracy on new farms. "
                "See the cross-source numbers in the evaluation report.",
                "- Not supported: onion, okra, brinjal, pomegranate, banana, wheat, chickpea and any crop "
                "not listed in `model.json`.",
                "- Treatment advice is not produced by the model; it comes from a curated, cited table.",
            ]
        )
        + "\n"
    )


def main() -> None:
    ckpt = torch.load(RUN / "best.pt", map_location="cpu", weights_only=False)
    classes = ckpt["classes"]
    metrics = json.loads((RUN / "metrics.json").read_text())
    model = build_model(len(classes), pretrained=False)
    model.load_state_dict(ckpt["model"])
    model.eval()
    out_dir = EXPORT / "disease_v1"
    out_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = out_dir / "model.onnx"
    dummy = torch.randn(2, 3, IMG_SIZE, IMG_SIZE)
    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    with torch.no_grad():
        ref = model(dummy).numpy()
    got = sess.run(["logits"], {"image": dummy.numpy()})[0]
    diff = float(np.abs(ref - got).max())
    print(f"ONNX max abs difference vs PyTorch: {diff:.2e}")
    assert diff < 1e-3, diff

    meta = {
        "version": VERSION,
        "backbone": BACKBONE,
        "input": {
            "size": IMG_SIZE,
            "resize_short_side": RESIZE,
            "crop": "center",
            "mean": MEAN,
            "std": STD,
            "layout": "NCHW RGB float32",
        },
        "classes": [
            {"id": c, "crop": tx.crop_of(c), "condition": tx.condition_of(c)} for c in classes
        ],
        "crops": {k: v for k, v in tx.CROPS.items() if any(tx.crop_of(c) == k for c in classes)},
        "temperature": metrics["temperature"],
        "tau_reject": metrics["tau_reject"],
        "tau_confident": metrics["tau_confident"],
        "evaluation": {
            k: metrics[k] for k in ("evaluated_on", "in_domain_test", "cross_source_test", "ood")
        },
        "licence": "CC-BY-4.0 (weights); see MODEL_CARD.md",
    }
    (out_dir / "model.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    (out_dir / "MODEL_CARD.md").write_text(model_card(meta))
    BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name in ("model.onnx", "model.json", "MODEL_CARD.md"):
        shutil.copy2(out_dir / name, BACKEND_MODEL_DIR / name)
    size_mb = onnx_path.stat().st_size / 1e6
    print(f"Exported {onnx_path} ({size_mb:.1f} MB) and copied to {BACKEND_MODEL_DIR}")
    print(f"Report: {REPORTS / 'disease_model_v1.md'}")
