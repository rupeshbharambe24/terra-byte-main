"""Fine-tune an ImageNet-pretrained MobileNetV3-Large (timm, Apache-2.0 weights) on MPS.

One head over every supported (crop, condition) class plus ``other``. Class-balanced sampling
(weights proportional to 1/sqrt(n)), label smoothing 0.1, AdamW + cosine schedule, one
head-only warm-up epoch. Training stops at ``--epochs`` or ``--limit-minutes``; the checkpoint
with the best validation macro-F1 is kept in ``runs/disease_v1/best.pt``.
"""

from __future__ import annotations

import json
import math
import time
from collections import Counter

import numpy as np
import timm
import torch
from torch import nn
from torch.utils.data import DataLoader, WeightedRandomSampler

from .data import ImageDataset, class_list, eval_transform, load_index, train_transform
from .paths import RUNS

BACKBONE = "mobilenetv3_large_100.ra_in1k"
RUN = RUNS / "disease_v1"


def single_thread(_worker_id: int) -> None:
    """Data-loader workers: one thread each (avoids oversubscribing the CPU)."""
    torch.set_num_threads(1)


def device() -> torch.device:
    return torch.device("mps" if torch.backends.mps.is_available() else "cpu")


def build_model(num_classes: int, pretrained: bool = True) -> nn.Module:
    return timm.create_model(BACKBONE, pretrained=pretrained, num_classes=num_classes)


def macro_f1(y_true: np.ndarray, y_pred: np.ndarray, n: int) -> float:
    f1s = []
    for c in range(n):
        tp = np.sum((y_pred == c) & (y_true == c))
        fp = np.sum((y_pred == c) & (y_true != c))
        fn = np.sum((y_pred != c) & (y_true == c))
        if tp + fp + fn == 0:
            continue
        f1s.append(2 * tp / (2 * tp + fp + fn))
    return float(np.mean(f1s))


@torch.no_grad()
def predict_logits(
    model: nn.Module, loader: DataLoader, dev: torch.device
) -> tuple[np.ndarray, np.ndarray]:
    model.eval()
    out, ys = [], []
    for x, y in loader:
        out.append(model(x.to(dev)).float().cpu())
        ys.append(y)
    return torch.cat(out).numpy(), torch.cat(ys).numpy()


def main(epochs: int = 12, batch_size: int = 64, limit_minutes: float = 75.0) -> None:
    torch.manual_seed(0)
    rows = load_index()
    classes = class_list(rows)
    train_rows = [r for r in rows if r.split == "train"]
    val_rows = [r for r in rows if r.split == "val"]
    counts = Counter(r.label for r in train_rows)
    weights = [1.0 / math.sqrt(counts[r.label]) for r in train_rows]
    sampler = WeightedRandomSampler(weights, num_samples=len(train_rows), replacement=True)
    train_dl = DataLoader(
        ImageDataset(train_rows, classes, train_transform()),
        batch_size=batch_size,
        sampler=sampler,
        num_workers=6,
        worker_init_fn=single_thread,
        persistent_workers=True,
        drop_last=True,
    )
    val_dl = DataLoader(
        ImageDataset(val_rows, classes, eval_transform()),
        batch_size=128,
        num_workers=4,
        worker_init_fn=single_thread,
        persistent_workers=True,
    )
    dev = device()
    model = build_model(len(classes)).to(dev)  # channels_last is ~2x slower on MPS
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    head = list(model.get_classifier().parameters())
    head_ids = {id(p) for p in head}
    body = [p for p in model.parameters() if id(p) not in head_ids]
    RUN.mkdir(parents=True, exist_ok=True)
    (RUN / "classes.json").write_text(json.dumps(classes, indent=1))
    print(f"{len(train_rows)} train / {len(val_rows)} val images, {len(classes)} classes, {dev}")

    steps_per_epoch = len(train_dl)
    opt = torch.optim.AdamW(
        [{"params": body, "lr": 5e-4}, {"params": head, "lr": 1e-3}], weight_decay=0.05
    )
    total = max(1, (epochs - 1) * steps_per_epoch)
    sched = torch.optim.lr_scheduler.LambdaLR(
        opt, lambda s: 0.5 * (1 + math.cos(math.pi * min(1.0, s / total)))
    )
    start = time.time()
    best, history = -1.0, []
    for epoch in range(epochs):
        warmup = epoch == 0
        for p in body:
            p.requires_grad_(not warmup)
        model.train()
        t0, seen, loss_sum = time.time(), 0, 0.0
        for x, y in train_dl:
            x = x.to(dev)
            y = y.to(dev)
            loss = criterion(model(x), y)
            opt.zero_grad(set_to_none=True)
            loss.backward()
            opt.step()
            if not warmup:
                sched.step()
            seen += len(y)
            loss_sum += loss.item() * len(y)
            if (seen // len(y)) % 50 == 0:
                print(f"  {seen} images, {seen / (time.time() - t0):.0f} img/s", flush=True)
        logits, ys = predict_logits(model, val_dl, dev)
        f1 = macro_f1(ys, logits.argmax(1), len(classes))
        acc = float((logits.argmax(1) == ys).mean())
        rate = seen / (time.time() - t0)
        history.append(
            {"epoch": epoch, "loss": loss_sum / seen, "val_macro_f1": f1, "val_acc": acc}
        )
        print(
            f"epoch {epoch}: loss {loss_sum / seen:.3f} val acc {acc:.4f} macro-F1 {f1:.4f} "
            f"({rate:.0f} img/s, {(time.time() - start) / 60:.1f} min)",
            flush=True,
        )
        if f1 > best:
            best = f1
            torch.save(
                {"model": model.state_dict(), "classes": classes, "backbone": BACKBONE},
                RUN / "best.pt",
            )
        if (time.time() - start) / 60 > limit_minutes:
            print("time limit reached")
            break
    (RUN / "history.json").write_text(json.dumps(history, indent=1))
    print(f"best val macro-F1 {best:.4f}")
