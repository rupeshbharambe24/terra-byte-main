"""Index loading, class list and image transforms shared by training, evaluation and export."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision.transforms import v2 as T

from . import taxonomy as tx
from .paths import PREPARED

IMG_SIZE = 224
RESIZE = 256
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)


@dataclass
class Row:
    path: str
    source: str
    label: str
    split: str
    kind: str


def load_index(path: Path = PREPARED / "index.csv") -> list[Row]:
    with open(path, newline="") as fh:
        return [
            Row(r["path"], r["source"], r["label"], r["split"], r["kind"])
            for r in csv.DictReader(fh)
        ]


def class_list(rows: list[Row]) -> list[str]:
    """Supported (crop, condition) classes sorted by name, with ``other`` last."""
    labels = sorted({r.label for r in rows if r.split == "train" and r.label != tx.OTHER})
    return [*labels, tx.OTHER]


def train_transform() -> T.Compose:
    return T.Compose(
        [
            T.ToImage(),
            T.RandomResizedCrop(IMG_SIZE, scale=(0.35, 1.0), antialias=True),
            T.RandomHorizontalFlip(),
            T.RandomVerticalFlip(),
            T.RandomApply([T.RandomRotation((90, 90))], p=0.25),
            T.ColorJitter(0.3, 0.3, 0.3, 0.05),
            T.TrivialAugmentWide(),
            T.RandomApply([T.JPEG((30, 95))], p=0.3),
            T.RandomApply([T.GaussianBlur(5, sigma=(0.1, 2.0))], p=0.2),
            T.ToDtype(torch.float32, scale=True),
            T.Normalize(MEAN, STD),
            T.RandomErasing(p=0.25),
        ]
    )


def eval_transform() -> T.Compose:
    return T.Compose(
        [
            T.ToImage(),
            T.Resize(RESIZE, antialias=True),
            T.CenterCrop(IMG_SIZE),
            T.ToDtype(torch.float32, scale=True),
            T.Normalize(MEAN, STD),
        ]
    )


class ImageDataset(Dataset):
    def __init__(self, rows: list[Row], classes: list[str], transform) -> None:
        self.rows = rows
        self.index = {c: i for i, c in enumerate(classes)}
        self.transform = transform

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i: int):
        row = self.rows[i]
        with Image.open(row.path) as im:
            img = im.convert("RGB")
        return self.transform(img), self.index.get(row.label, -1)
