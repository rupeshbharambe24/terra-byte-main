"""``terrabyte-load-model-metrics``: store the disease model's held-out evaluation (from
``models/disease/model.json``, written by ``ml/`` ``tbml export``) as ``model_evaluations`` rows,
so the admin "AI model performance" page shows real numbers. Re-running replaces the rows of the
same model version."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from terrabyte.config import get_settings
from terrabyte.db import Database
from terrabyte.models import ModelEvaluation

MODEL_NAME = "Crop disease classifier"


def evaluation_rows(meta: dict) -> list[ModelEvaluation]:
    ev = meta["evaluation"]
    when = datetime.fromisoformat(ev["evaluated_on"]).replace(tzinfo=UTC)
    version = meta["version"]
    rows: list[ModelEvaluation] = []

    def add(dataset: str, metric: str, value: float | None, details: dict) -> None:
        if value is None:
            return
        rows.append(
            ModelEvaluation(
                model_name=MODEL_NAME,
                version=version,
                dataset=dataset[:200],
                metric_name=metric,
                value=float(value),
                evaluated_at=when,
                details=details,
            )
        )

    for section, label in (
        ("in_domain_test", "In-domain test"),
        ("cross_source_test", "Cross-source test"),
    ):
        for key, m in ev[section].items():
            name = f"{label}: {key} (n={m['n']})"
            add(name, "top-1 accuracy % (crop-masked)", m["top1"], m)
            add(name, "top-3 accuracy %", m["top3"], m)
            add(name, "ECE", m["ece"], m)
    for key, m in ev["ood"].items():
        add(f"Out-of-distribution: {key} (n={m['n']})", "rejected %", m["rejected"], m)
    return rows


def load_metrics(db: Session, meta: dict) -> int:
    db.execute(
        delete(ModelEvaluation).where(
            ModelEvaluation.model_name == MODEL_NAME, ModelEvaluation.version == meta["version"]
        )
    )
    rows = evaluation_rows(meta)
    db.add_all(rows)
    db.commit()
    return len(rows)


def main(argv: list[str] | None = None) -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(prog="terrabyte-load-model-metrics")
    parser.add_argument("--model-dir", type=Path, default=settings.disease_model_dir)
    args = parser.parse_args(argv)
    meta = json.loads((args.model_dir / "model.json").read_text(encoding="utf-8"))
    database = Database(settings.database_url)
    database.create_all()
    with database.session_factory() as db:
        n = load_metrics(db, meta)
    print(f"Stored {n} evaluation rows for {MODEL_NAME} {meta['version']}.")


if __name__ == "__main__":  # pragma: no cover
    main()
