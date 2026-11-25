"""``terrabyte-backtest-prices``: rolling-origin backtest of every series with enough data.

Writes three ``model_evaluations`` rows per series (MASE over 1-7 day horizons for naive,
seasonal naive and ETS; the details hold every horizon, the interval quantiles, their measured
coverage and which method the API will use). The forecast endpoint reads these rows.
"""

from __future__ import annotations

import argparse
import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from terrabyte.config import get_settings
from terrabyte.db import Database, utcnow
from terrabyte.models import ModelEvaluation
from terrabyte.prices.forecast import METHODS, backtest
from terrabyte.prices.series import list_series, load_series

MODEL_NAME = "Mandi price forecast"
MODEL_VERSION = "ets-damped-v1"
METRIC = "MASE 1-7 d ({method})"


def series_key(market: str, commodity: str) -> str:
    return f"{commodity} @ {market}"


def evaluate_all(db: Session, min_points: int = 80) -> list[tuple[str, dict]]:
    done = []
    for market, commodity, *_rest in list_series(db):
        series = load_series(db, market, commodity)
        if series is None or len(series.points) < min_points:
            continue
        result = backtest(series.dates, series.values)
        if result is None:
            continue
        details = result.to_details() | {
            "market": market,
            "commodity": commodity,
            "variety": series.variety,
            "last_date": series.last_date.isoformat() if series.last_date else None,
            "sources": series.sources,
        }
        now = utcnow()
        for method in METHODS:
            value = result.mase_1_7[method]
            if math.isnan(value):
                continue
            db.add(
                ModelEvaluation(
                    model_name=MODEL_NAME,
                    version=MODEL_VERSION,
                    dataset=series_key(market, commodity),
                    metric_name=METRIC.format(method=method),
                    value=round(value, 4),
                    evaluated_at=now,
                    details=details,
                )
            )
        done.append((series_key(market, commodity), details))
    db.commit()
    return done


def latest_evaluation(db: Session, market: str, commodity: str) -> ModelEvaluation | None:
    return db.scalar(
        select(ModelEvaluation)
        .where(
            ModelEvaluation.model_name == MODEL_NAME,
            ModelEvaluation.dataset == series_key(market, commodity),
        )
        .order_by(ModelEvaluation.evaluated_at.desc(), ModelEvaluation.id.desc())
        .limit(1)
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="terrabyte-backtest-prices")
    parser.add_argument("--min-points", type=int, default=80)
    args = parser.parse_args(argv)
    database = Database(get_settings().database_url)
    database.create_all()
    with database.session_factory() as db:
        done = evaluate_all(db, args.min_points)
    print(f"Backtested {len(done)} series.")
    for key, d in done:
        m = d["mase_1_7"]
        print(
            f"  {key}: naive {m['naive']:.3f}, seasonal {m['seasonal_naive']:.3f}, "
            f"ets {m['ets']:.3f} -> {d['chosen']} (80% coverage {d['coverage_80'][d['chosen']]})"
        )


if __name__ == "__main__":  # pragma: no cover
    main()
