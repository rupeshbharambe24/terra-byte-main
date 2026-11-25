"""Calibrate, choose thresholds on the validation split, then evaluate honestly.

* Temperature scaling (Guo et al. 2017) fitted on the validation split.
* Rejection: probability of the ``other`` class (full softmax, temperature-scaled). The threshold
  lets 95 % of validation leaf images through.
* Confidence: top-1 probability after masking the logits to the crop the farmer selected. The
  threshold is the lowest value whose confident validation predictions are >= 95 % correct.
* Reported: in-domain test (same sources, held-out images), cross-source test (sources never
  trained on), out-of-distribution rejection (banana leaves, unsupported crops in field photos,
  Imagenette photos, synthetic blank/noise images, plus pure white and black images), ECE.

Writes ``runs/disease_v1/metrics.json`` and ``reports/disease_model_v1.md``.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import date

import numpy as np
import torch
from PIL import Image
from torch.utils.data import DataLoader

from . import taxonomy as tx
from .data import ImageDataset, eval_transform, load_index
from .paths import REPORTS
from .sources import SOURCES
from .train import RUN, build_model, device, predict_logits, single_thread

VERSION = "disease-mnv3l-v1"
TPR_TARGET = 0.95
CONF_PRECISION = 0.95


def softmax(z: np.ndarray, t: float = 1.0) -> np.ndarray:
    z = z / t
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def ece(conf: np.ndarray, correct: np.ndarray, bins: int = 15) -> float:
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for lo, hi in zip(edges[:-1], edges[1:], strict=True):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            total += m.mean() * abs(conf[m].mean() - correct[m].mean())
    return float(total)


def fit_temperature(logits: np.ndarray, y: np.ndarray) -> float:
    best_t, best_nll = 1.0, np.inf
    for t in np.linspace(0.5, 4.0, 71):
        p = softmax(logits, t)[np.arange(len(y)), y]
        nll = -np.log(np.clip(p, 1e-12, 1)).mean()
        if nll < best_nll:
            best_t, best_nll = float(t), nll
    return best_t


class Scorer:
    def __init__(self, classes: list[str], t: float) -> None:
        self.classes = classes
        self.t = t
        self.other = classes.index(tx.OTHER)
        self.crop_idx: dict[str, list[int]] = defaultdict(list)
        for i, c in enumerate(classes):
            if c != tx.OTHER:
                self.crop_idx[tx.crop_of(c)].append(i)

    def reject_score(self, logits: np.ndarray) -> np.ndarray:
        return softmax(logits, self.t)[:, self.other]

    def masked(self, logits: np.ndarray, crop: str) -> tuple[np.ndarray, list[int]]:
        idx = self.crop_idx[crop]
        return softmax(logits[:, idx], self.t), idx


def run_logits(rows, classes, model, dev):
    dl = DataLoader(
        ImageDataset(rows, classes, eval_transform()),
        batch_size=128,
        num_workers=4,
        worker_init_fn=single_thread,
    )
    return predict_logits(model, dl, dev)


def _pct(x: float) -> float:
    return round(100 * float(x), 1)


def main() -> None:
    ckpt = torch.load(RUN / "best.pt", map_location="cpu", weights_only=False)
    classes = ckpt["classes"]
    dev = device()
    model = build_model(len(classes), pretrained=False)
    model.load_state_dict(ckpt["model"])
    model = model.to(dev).eval()

    rows = load_index()
    by_split = defaultdict(list)
    for r in rows:
        by_split[r.split].append(r)
    logits = {}
    for split in ("val", "test", "xtest", "ood"):
        logits[split], _ = run_logits(by_split[split], classes, model, dev)
        print(f"{split}: {len(by_split[split])} images", flush=True)

    # Plain white / black / grey images (the old model called a white page "99 % diseased").
    plain = {}
    tf = eval_transform()
    for name, colour in {
        "white": (255, 255, 255),
        "black": (0, 0, 0),
        "grey": (128, 128, 128),
    }.items():
        x = tf(Image.new("RGB", (400, 300), colour)).unsqueeze(0).to(dev)
        with torch.no_grad():
            plain[name] = model(x).float().cpu().numpy()

    cls_index = {c: i for i, c in enumerate(classes)}
    val_rows = by_split["val"]
    val_y = np.array([cls_index[r.label] for r in val_rows])
    t = fit_temperature(logits["val"], val_y)
    sc = Scorer(classes, t)

    # Thresholds from validation leaf images.
    val_leaf = np.array([r.label != tx.OTHER for r in val_rows])
    rs_val = sc.reject_score(logits["val"])
    tau_reject = float(np.quantile(rs_val[val_leaf], TPR_TARGET))
    confs, oks = [], []
    for i, r in enumerate(val_rows):
        if r.label == tx.OTHER or rs_val[i] > tau_reject:
            continue
        p, idx = sc.masked(logits["val"][i : i + 1], tx.crop_of(r.label))
        confs.append(p.max())
        oks.append(idx[int(p.argmax())] == cls_index[r.label])
    confs, oks = np.array(confs), np.array(oks)
    tau_conf = 1.0
    for cand in np.linspace(0.3, 0.99, 70):
        m = confs >= cand
        if m.sum() >= 20 and oks[m].mean() >= CONF_PRECISION:
            tau_conf = float(cand)
            break

    def leaf_metrics(split: str, group_key) -> dict:
        groups: dict[str, dict] = defaultdict(lambda: defaultdict(list))
        rs = sc.reject_score(logits[split])
        for i, r in enumerate(by_split[split]):
            if r.label == tx.OTHER:
                continue
            crop = tx.crop_of(r.label)
            p, idx = sc.masked(logits[split][i : i + 1], crop)
            order = [idx[j] for j in np.argsort(-p[0])]
            y = cls_index[r.label]
            g = groups[group_key(r)]
            g["top1"].append(order[0] == y)
            g["top3"].append(y in order[:3])
            g["conf"].append(float(p.max()))
            g["rejected"].append(rs[i] > tau_reject)
            confident = (rs[i] <= tau_reject) and p.max() >= tau_conf
            g["confident"].append(confident)
            if confident:
                g["confident_ok"].append(order[0] == y)
            g["unmasked_top1"].append(int(np.argmax(logits[split][i, :-1])) == y)
        out = {}
        for key, g in sorted(groups.items()):
            top1 = np.array(g["top1"])
            out[key] = {
                "n": len(top1),
                "top1": _pct(top1.mean()),
                "top3": _pct(np.mean(g["top3"])),
                "top1_without_crop_mask": _pct(np.mean(g["unmasked_top1"])),
                "ece": round(ece(np.array(g["conf"]), top1.astype(float)), 3),
                "falsely_rejected": _pct(np.mean(g["rejected"])),
                "confident": _pct(np.mean(g["confident"])),
                "confident_accuracy": _pct(np.mean(g["confident_ok"]))
                if g["confident_ok"]
                else None,
            }
        return out

    def by_crop(r):
        return tx.crop_of(r.label)

    def by_source_crop(r):
        return f"{r.source}: {tx.crop_of(r.label)}"

    def ood_metrics() -> dict:
        res = {}
        kinds = defaultdict(list)
        for i, r in enumerate(by_split["ood"]):
            kinds[r.kind].append(i)
        negatives = {
            "in-domain negatives (test split 'other')": [
                i for i, r in enumerate(by_split["test"]) if r.label == tx.OTHER
            ]
        }
        for kind, ids in list(kinds.items()) + [(k, v) for k, v in negatives.items()]:
            src = "test" if kind in negatives else "ood"
            lg = logits[src][ids]
            rej = sc.reject_score(lg) > tau_reject
            # If not rejected, how often would the answer look "confident" for a crop the
            # farmer might have picked? (averaged over every supported crop)
            conf_rates = []
            for crop in sc.crop_idx:
                p, _ = sc.masked(lg, crop)
                conf_rates.append(np.mean((~rej) & (p.max(axis=1) >= tau_conf)))
            res[kind] = {
                "n": len(ids),
                "rejected": _pct(rej.mean()),
                "confident_diagnosis_any_crop_avg": _pct(np.mean(conf_rates)),
            }
        for name, lg in plain.items():
            res[f"plain {name} image"] = {
                "n": 1,
                "rejected": _pct(float(sc.reject_score(lg)[0] > tau_reject)),
                "p_other": round(float(sc.reject_score(lg)[0]), 4),
            }
        return res

    metrics = {
        "version": VERSION,
        "evaluated_on": date.today().isoformat(),
        "temperature": round(t, 3),
        "tau_reject": round(tau_reject, 4),
        "tau_confident": round(tau_conf, 3),
        "classes": classes,
        "n_train": len(by_split["train"]),
        "n_val": len(val_rows),
        "in_domain_test": leaf_metrics("test", by_crop),
        "cross_source_test": leaf_metrics("xtest", by_source_crop),
        "ood": ood_metrics(),
    }
    (RUN / "metrics.json").write_text(json.dumps(metrics, indent=1))
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "disease_model_v1.md").write_text(render_report(metrics))
    print(json.dumps({k: v for k, v in metrics.items() if k != "classes"}, indent=1))


def _table(section: dict, first: str) -> list[str]:
    lines = [
        f"| {first} | n | top-1 | top-3 | top-1 without crop mask | ECE | falsely rejected | "
        "confident | accuracy when confident |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for key, m in section.items():
        ca = "–" if m["confident_accuracy"] is None else f"{m['confident_accuracy']} %"
        lines.append(
            f"| {key} | {m['n']} | {m['top1']} % | {m['top3']} % | {m['top1_without_crop_mask']} % "
            f"| {m['ece']} | {m['falsely_rejected']} % | {m['confident']} % | {ca} |"
        )
    return lines


def render_report(m: dict) -> str:
    src_lines = [
        f"| {s.key} | [{s.title}]({s.url}) | {s.licence} | {s.origin} | "
        f"{'evaluation only' if s.eval_only else 'training'} |"
        for s in SOURCES
    ]
    ood_lines = [
        "| set | n | rejected | confident diagnosis if not rejected (avg over crops) |",
        "|---|---|---|---|",
    ]
    for k, v in m["ood"].items():
        extra = v.get("confident_diagnosis_any_crop_avg", "–")
        extra = f"{extra} %" if extra != "–" else extra
        ood_lines.append(f"| {k} | {v['n']} | {v['rejected']} % | {extra} |")
    return (
        "\n".join(
            [
                f"# Crop disease model `{m['version']}`: evaluation report",
                "",
                f"Evaluated on {m['evaluated_on']} by `uv run tbml evaluate` (reproducible from "
                "`ml/`). Backbone: MobileNetV3-Large 1.0 (timm `mobilenetv3_large_100.ra_in1k`, "
                "ImageNet-pretrained, Apache-2.0 weights), 224 px, one head over "
                f"{len(m['classes']) - 1} (crop, condition) classes + `other`. "
                f"{m['n_train']} training images, {m['n_val']} validation images.",
                "",
                "## How to read this",
                "",
                "- **In-domain test** = held-out images from the *same* datasets as training. These "
                "numbers are optimistic: photos in one dataset share camera, background and season.",
                "- **Cross-source test** = datasets never used in training (PlantDoc web/field photos, "
                "cotton from Pune, a second sugarcane dataset). This is the better predictor of field "
                "performance.",
                '- The app masks the logits to the crop the farmer selected ("top-1"); the unmasked '
                "column shows what happens without that.",
                f"- Temperature scaling T = {m['temperature']} (fitted on validation). Rejection "
                f"threshold on P(other) = {m['tau_reject']} (95 % of validation leaf photos pass). "
                f"A result is **confident** when the crop-masked top-1 probability is >= "
                f"{m['tau_confident']} (>= 95 % precision on validation); otherwise **uncertain** "
                "(top-3 shown, expert advice suggested).",
                "",
                "## In-domain test (held-out images, same sources)",
                "",
                *_table(m["in_domain_test"], "crop"),
                "",
                "## Cross-source test (sources never trained on)",
                "",
                *_table(m["cross_source_test"], "source: crop"),
                "",
                "## Out-of-distribution rejection",
                "",
                "Synthetic images of the same *kinds* (flat colours, noise, gradients) were used as "
                "training negatives, but these test images were generated with different seeds. "
                "Banana leaves and the PlantDoc photos of unsupported crops were never seen in "
                "training (PlantVillage lab photos of apple, cherry, etc. were).",
                "",
                *ood_lines,
                "",
                "## Data sources and licences",
                "",
                "| key | dataset | licence | origin | use |",
                "|---|---|---|---|---|",
                *src_lines,
                "",
                "## Known limitations",
                "",
                "- Most training datasets come from one place and season; accuracy on a farmer's photo "
                "will be lower than the in-domain numbers. Several crops have no cross-source test.",
                "- Onion, okra, brinjal, pomegranate, banana, wheat and chickpea are not supported yet.",
                "- The rejection gate was tuned for 95 % of real leaf photos to pass, so about 1 in 20 "
                "real photos is asked to be retaken.",
            ]
        )
        + "\n"
    )
