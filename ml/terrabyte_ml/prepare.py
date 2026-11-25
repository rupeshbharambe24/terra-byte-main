"""Build the training index: map source folders to canonical classes, cap, resize, dedupe, split.

Output: ``data/prepared/<source>/<label>/<id>.jpg`` (short side 256 px, JPEG q90) and
``data/prepared/index.csv`` with columns ``path, source, label, split, kind, phash``.

Splits:
* ``train`` / ``val`` / ``test``: stratified 70/15/15 random split of the training sources
  (after removing exact perceptual-hash duplicates, so copies cannot leak across splits);
* ``xtest``: whole sources never trained on (cross-source test: PlantDoc field photos, cotton
  from Pune, a second sugarcane dataset);
* ``ood``: out-of-distribution images that must be rejected (banana leaves, unsupported crops in
  PlantDoc, Imagenette validation photos, synthetic blank/noise images).
"""

from __future__ import annotations

import csv
import hashlib
import random
import re
from collections import Counter, defaultdict
from collections.abc import Iterator
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import imagehash
import numpy as np
from PIL import Image, ImageFilter, ImageOps

from . import taxonomy as tx
from .paths import EXTRACTED, PREPARED

IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SHORT_SIDE = 256
SEED = 20261125
PV_CAP = 300
PV_OTHER_CAP = 120
IMAGENETTE_TRAIN_CAP = 2500
IMAGENETTE_OOD_CAP = 800
CLASS_CAP = 900  # big field classes (e.g. grape healthy) are capped too


@dataclass
class Item:
    src: Path | None  # None for synthetic images
    source: str
    label: str
    role: str  # pool | xtest | ood
    kind: str = ""  # ood sub-type
    synth_seed: int = -1


def _images(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    return sorted(p for p in folder.rglob("*") if p.suffix.lower() in IMG_EXT and p.is_file())


def _find_dir(root: Path, name: str) -> Path | None:
    for p in root.rglob("*"):
        if p.is_dir() and p.name == name:
            return p
    return None


def _folder_source(key: str, mapping: dict[str, str], role: str = "pool") -> Iterator[Item]:
    root = EXTRACTED / key
    for folder, label in mapping.items():
        d = _find_dir(root, folder)
        if d is None:
            print(f"  [{key}] folder not found: {folder}")
            continue
        for p in _images(d):
            yield Item(p, key, label, role)


def collect(rng: random.Random) -> list[Item]:
    items: list[Item] = []
    # PlantVillage (CC0 derivative): capped per class.
    pv_root = EXTRACTED / "plantvillage"
    pv_base = next((d for d in pv_root.glob("*") if d.is_dir()), pv_root)
    for d in sorted(pv_base.iterdir()) if pv_base.exists() else []:
        files = _images(d)
        rng.shuffle(files)
        if d.name in tx.PLANTVILLAGE:
            items += [
                Item(p, "plantvillage", tx.PLANTVILLAGE[d.name], "pool") for p in files[:PV_CAP]
            ]
        elif d.name.startswith(tx.PLANTVILLAGE_OTHER_PREFIXES):
            cap = len(files) if d.name == "Background_without_leaves" else PV_OTHER_CAP
            items += [Item(p, "plantvillage", tx.OTHER, "pool") for p in files[:cap]]
    # NGLD grape (file name prefix = class).
    for p in _images(EXTRACTED / "ngld_grape"):
        prefix = re.sub(r"_\d+$", "", p.stem)
        if prefix in tx.NGLD:
            items.append(Item(p, "ngld_grape", tx.NGLD[prefix], "pool"))
    # Soybean (file name prefix = class).
    for p in _images(EXTRACTED / "soybean_multi"):
        prefix = re.sub(r"[\s(_].*$", "", p.stem).upper()
        if prefix in tx.SOYBEAN:
            items.append(Item(p, "soybean_multi", tx.SOYBEAN[prefix], "pool"))
    items += _folder_source("cotton_t9", tx.COTTON_T9)
    items += _folder_source("ppld_pigeonpea", tx.PPLD)
    items += _folder_source("chilli_krishna", tx.CHILLI)
    items += _folder_source("sugarcane_mh", tx.SUGARCANE_MH)
    items += _folder_source("rice_sethy", tx.RICE_SETHY)
    # Imagenette: train split -> "other" negatives; val split -> OOD test.
    inet = EXTRACTED / "imagenette"
    train = _images(next(iter(inet.glob("*/train")), inet / "missing"))
    val = _images(next(iter(inet.glob("*/val")), inet / "missing"))
    rng.shuffle(train)
    rng.shuffle(val)
    items += [Item(p, "imagenette", tx.OTHER, "pool") for p in train[:IMAGENETTE_TRAIN_CAP]]
    items += [
        Item(p, "imagenette", tx.OTHER, "ood", "imagenette_val") for p in val[:IMAGENETTE_OOD_CAP]
    ]
    # Synthetic negatives (blank, noise, gradients) for training, and a separate set for testing.
    items += [Item(None, "synthetic", tx.OTHER, "pool", synth_seed=i) for i in range(400)]
    items += [Item(None, "synthetic", tx.OTHER, "ood", "synthetic", 10_000 + i) for i in range(200)]
    # Cross-source tests.
    items += _folder_source("cotton_pune", tx.COTTON_PUNE, role="xtest")
    items += _folder_source("sugarcane_12", tx.SUGARCANE_12, role="xtest")
    items += _folder_source("plantdoc_test", tx.PLANTDOC, role="xtest")
    for folder in tx.PLANTDOC_OOD:
        d = _find_dir(EXTRACTED / "plantdoc_test", folder)
        items += (
            [
                Item(p, "plantdoc_test", tx.OTHER, "ood", "plantdoc_unsupported_crop")
                for p in _images(d)
            ]
            if d
            else []
        )
    items += [
        Item(p, "banana_lsd", tx.OTHER, "ood", "banana_leaf")
        for p in _images(EXTRACTED / "banana_lsd")
    ]
    return items


def synthetic_image(seed: int) -> Image.Image:
    r = np.random.default_rng(seed)
    kind = seed % 6
    size = (320, 320)
    if kind == 0:  # flat colour, including pure white and black
        colour = (
            [(255, 255, 255), (0, 0, 0), (128, 128, 128)][seed % 3]
            if seed % 4 == 0
            else tuple(int(x) for x in r.integers(0, 256, 3))
        )
        return Image.new("RGB", size, colour)
    if kind == 1:  # gaussian noise
        arr = r.normal(128, r.uniform(20, 90), (*size, 3)).clip(0, 255).astype(np.uint8)
        return Image.fromarray(arr)
    if kind == 2:  # uniform noise
        return Image.fromarray(r.integers(0, 256, (*size, 3), dtype=np.uint8))
    if kind == 3:  # gradient
        x = np.linspace(0, 1, size[0])[None, :, None]
        y = np.linspace(0, 1, size[1])[:, None, None]
        c1, c2 = r.integers(0, 256, 3), r.integers(0, 256, 3)
        arr = (c1 * x + c2 * y) / 2 + r.normal(0, 5, (*size, 3))
        return Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    if kind == 4:  # blurred blobs
        arr = r.integers(0, 256, (8, 8, 3), dtype=np.uint8)
        return Image.fromarray(arr).resize(size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(8))
    # near-white paper with faint noise (the old model called this a disease)
    arr = (245 + r.normal(0, 4, (*size, 3))).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def _process(args: tuple[Item, Path]) -> tuple[str, str] | None:
    item, out = args
    try:
        if out.exists():  # already prepared by an earlier run
            with Image.open(out) as done:
                return str(out), str(imagehash.phash(done))
        if item.src is None:
            img = synthetic_image(item.synth_seed)
        else:
            with Image.open(item.src) as im:
                img = ImageOps.exif_transpose(im).convert("RGB")
        w, h = img.size
        scale = SHORT_SIDE / min(w, h)
        if scale < 1:
            img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.BILINEAR)
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out, "JPEG", quality=90)
        return str(out), str(imagehash.phash(img))
    except Exception as exc:  # noqa: BLE001 - corrupt files are skipped and reported
        print(f"  skip {item.src}: {exc}")
        return None


def _out_path(item: Item) -> Path:
    ident = f"{item.src}|{item.synth_seed}".encode()
    name = hashlib.sha1(ident, usedforsecurity=False).hexdigest()[:16]
    return PREPARED / item.source / item.label / f"{name}.jpg"


def main() -> None:
    rng = random.Random(SEED)
    items = collect(rng)
    # Cap large pool classes per source.
    grouped: dict[tuple[str, str, str], list[Item]] = defaultdict(list)
    for it in items:
        grouped[(it.source, it.label, it.role)].append(it)
    capped: list[Item] = []
    for (_src, label, role), group in grouped.items():
        # Seeded per group, so adding test-only sources never changes the training split.
        random.Random(f"{SEED}|{_src}|{label}|{role}").shuffle(group)
        cap = CLASS_CAP if role == "pool" and label != tx.OTHER else len(group)
        capped += group[:cap]
    print(f"Collected {len(capped)} images; resizing...")
    jobs = [(it, _out_path(it)) for it in capped]
    with ProcessPoolExecutor(max_workers=9) as pool:
        results = list(pool.map(_process, jobs, chunksize=64))
    rows = []
    seen_hash: dict[str, str] = {}
    dupes = 0
    for (it, _out), res in zip(jobs, results, strict=True):
        if res is None:
            continue
        path, phash = res
        if it.role == "pool":
            if phash in seen_hash and it.source != "synthetic":
                dupes += 1
                continue
            seen_hash[phash] = it.label
        rows.append(
            {
                "path": path,
                "source": it.source,
                "label": it.label,
                "role": it.role,
                "kind": it.kind,
                "phash": phash,
            }
        )
    # Stratified split of the pool.
    by_label: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        if row["role"] == "pool":
            by_label[row["label"]].append(row)
        else:
            row["split"] = row["role"]
    for group in by_label.values():
        group.sort(key=lambda r: r["path"])
        random.Random(f"{SEED}|split|{group[0]['label']}").shuffle(group)
        n = len(group)
        n_val, n_test = max(1, round(n * 0.15)), max(1, round(n * 0.15))
        for i, row in enumerate(group):
            row["split"] = "val" if i < n_val else "test" if i < n_val + n_test else "train"
    PREPARED.mkdir(parents=True, exist_ok=True)
    with open(PREPARED / "index.csv", "w", newline="") as fh:
        writer = csv.DictWriter(
            fh, fieldnames=["path", "source", "label", "split", "kind", "phash"]
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row[k] for k in writer.fieldnames})
    print(f"Wrote {len(rows)} rows ({dupes} exact perceptual duplicates removed).")
    counts = Counter((r["split"], r["label"]) for r in rows)
    for (split, label), n in sorted(counts.items()):
        print(f"  {split:6s} {label:40s} {n}")
