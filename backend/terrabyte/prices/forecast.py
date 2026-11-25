"""Honest short-term price forecasts.

Three methods are compared in a rolling-origin backtest on each (market, commodity) series:

* ``naive``: tomorrow = the last observed price;
* ``seasonal_naive``: the price observed one week (or 2, 3, 4 weeks) before the target day;
* ``ets``: damped-trend exponential smoothing on log prices (parameters chosen by one-step
  squared error on the training window; trend 0 is allowed, i.e. simple smoothing).

Errors are scaled by the in-sample mean absolute day-to-day change (MASE). The learned model is
used only if its mean MASE over horizons 1-7 days is lower than naive's; otherwise the naive
forecast is shown and labelled as such. Prediction intervals are empirical quantiles (10 % and
90 %) of the backtest's log errors for each horizon, and their coverage is checked on the later
half of the origins after calibrating on the earlier half.

Pure Python on purpose: series are short (hundreds of points) and this keeps the API light.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta
from statistics import mean

POINT_HORIZONS = (1, 2, 3, 4, 5, 6, 7)
RANGE_HORIZONS = (14, 28)
METHODS = ("naive", "seasonal_naive", "ets")
Q_LOW, Q_HIGH = 0.10, 0.90
STALE_AFTER_DAYS = 14
MIN_TRAIN = 60
MIN_ORIGINS = 20

_ALPHAS = (0.1, 0.2, 0.3, 0.5, 0.7, 0.9)
_BETAS = (0.0, 0.05, 0.15)
_PHIS = (0.8, 0.9, 0.98)


# ---- ETS ----------------------------------------------------------------------------------------


@dataclass(frozen=True)
class EtsFit:
    alpha: float
    beta: float
    phi: float
    level: float
    trend: float

    def forecast_log(self, steps: int) -> float:
        damp = sum(self.phi**i for i in range(1, steps + 1))
        return self.level + damp * self.trend


def _run_ets(
    logs: list[float], alpha: float, beta: float, phi: float
) -> tuple[float, float, float]:
    level, trend, sse = logs[0], 0.0, 0.0
    for y in logs[1:]:
        pred = level + phi * trend
        err = y - pred
        sse += err * err
        new_level = pred + alpha * err
        trend = phi * trend + beta * (new_level - level - phi * trend) if beta else 0.0
        level = new_level
    return level, trend, sse


def fit_ets(values: list[float]) -> EtsFit:
    logs = [math.log(v) for v in values]
    best: EtsFit | None = None
    best_sse = math.inf
    for alpha in _ALPHAS:
        for beta in _BETAS:
            for phi in _PHIS if beta else (1.0,):
                level, trend, sse = _run_ets(logs, alpha, beta, phi)
                if sse < best_sse:
                    best_sse = sse
                    best = EtsFit(alpha, beta, phi, level, trend)
    assert best is not None  # noqa: S101 - values is never empty here
    return best


# ---- Baselines ----------------------------------------------------------------------------------


def _value_on_or_before(dates: list[date], values: list[float], day: date) -> float | None:
    lo, hi = 0, len(dates)
    while lo < hi:
        mid = (lo + hi) // 2
        if dates[mid] <= day:
            lo = mid + 1
        else:
            hi = mid
    return values[lo - 1] if lo else None


def seasonal_naive(dates: list[date], values: list[float], origin: date, h: int) -> float:
    weeks = math.ceil(h / 7)
    found = _value_on_or_before(dates, values, origin + timedelta(days=h - 7 * weeks))
    return found if found is not None else values[-1]


def predict(
    method: str, dates: list[date], values: list[float], h: int, fit: EtsFit | None = None
) -> float:
    if method == "naive":
        return values[-1]
    if method == "seasonal_naive":
        return seasonal_naive(dates, values, dates[-1], h)
    fit = fit or fit_ets(values)
    return math.exp(fit.forecast_log(h))


def mase_scale(values: list[float]) -> float:
    diffs = [abs(b - a) for a, b in zip(values, values[1:], strict=False)]
    return mean(diffs) if diffs else 0.0


def _quantile(xs: list[float], q: float) -> float:
    s = sorted(xs)
    if not s:
        return 0.0
    pos = (len(s) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)


# ---- Backtest -----------------------------------------------------------------------------------


@dataclass
class BacktestResult:
    n_points: int
    n_origins: int
    first_origin: date
    last_origin: date
    mase: dict[str, dict[int, float]]  # method -> horizon -> MASE
    mase_1_7: dict[str, float]  # method -> mean MASE over horizons 1..7
    quantiles: dict[str, dict[int, tuple[float, float]]]  # method -> h -> (q10, q90) log errors
    coverage: dict[str, float]  # method -> empirical 80 % interval coverage (later half)
    chosen: str

    def to_details(self) -> dict:
        return {
            "n_points": self.n_points,
            "n_origins": self.n_origins,
            "first_origin": self.first_origin.isoformat(),
            "last_origin": self.last_origin.isoformat(),
            "mase": {
                m: {str(h): round(v, 4) for h, v in hv.items()} for m, hv in self.mase.items()
            },
            "mase_1_7": {m: round(v, 4) for m, v in self.mase_1_7.items()},
            "quantiles": {
                m: {str(h): [round(a, 5), round(b, 5)] for h, (a, b) in hv.items()}
                for m, hv in self.quantiles.items()
            },
            "coverage_80": {m: round(v, 4) for m, v in self.coverage.items()},
            "chosen": self.chosen,
        }


def backtest(
    dates: list[date], values: list[float], max_origins: int = 120, refit_every: int = 5
) -> BacktestResult | None:
    """Rolling-origin backtest over the last ``max_origins`` observed days. None if too short."""
    n = len(values)
    if n < MIN_TRAIN + MIN_ORIGINS:
        return None
    index = {d: i for i, d in enumerate(dates)}
    start = max(MIN_TRAIN, n - max_origins - 1)
    origins = list(range(start, n - 1))
    horizons = POINT_HORIZONS + RANGE_HORIZONS
    scaled: dict[str, dict[int, list[float]]] = {m: {h: [] for h in horizons} for m in METHODS}
    logerr: dict[str, dict[int, list[tuple[int, float]]]] = {
        m: {h: [] for h in horizons} for m in METHODS
    }
    fit: EtsFit | None = None
    for k, i in enumerate(origins):
        train_d, train_v = dates[: i + 1], values[: i + 1]
        scale = mase_scale(train_v[-365:])
        if scale <= 0:
            continue
        if fit is None or k % refit_every == 0:
            fit = fit_ets(train_v[-365:])
        else:  # update the level/trend with the new observations, keeping the parameters
            level, trend, _ = _run_ets(
                [math.log(v) for v in train_v[-365:]], fit.alpha, fit.beta, fit.phi
            )
            fit = EtsFit(fit.alpha, fit.beta, fit.phi, level, trend)
        for h in horizons:
            target = _target_index(index, dates, dates[i], h)
            if target is None:
                continue
            y = values[target]
            for m in METHODS:
                p = predict(m, train_d, train_v, h, fit)
                scaled[m][h].append(abs(y - p) / scale)
                logerr[m][h].append((k, math.log(y) - math.log(p)))
    if not scaled["naive"][1]:
        return None
    mase = {m: {h: mean(v) for h, v in hv.items() if v} for m, hv in scaled.items()}
    mase_1_7 = {m: mean(mase[m][h] for h in POINT_HORIZONS if h in mase[m]) for m in METHODS}
    half = len(origins) // 2
    quantiles: dict[str, dict[int, tuple[float, float]]] = {}
    coverage: dict[str, float] = {}
    for m in METHODS:
        quantiles[m] = {}
        hits, total = 0, 0
        for h in horizons:
            errs = logerr[m][h]
            if len(errs) < 5:
                continue
            all_e = [e for _, e in errs]
            quantiles[m][h] = (_quantile(all_e, Q_LOW), _quantile(all_e, Q_HIGH))
            calib = [e for k, e in errs if k < half]
            test = [e for k, e in errs if k >= half]
            if len(calib) >= 5 and test:
                lo, hi = _quantile(calib, Q_LOW), _quantile(calib, Q_HIGH)
                hits += sum(lo <= e <= hi for e in test)
                total += len(test)
        coverage[m] = hits / total if total else float("nan")
    chosen = "ets" if mase_1_7["ets"] < mase_1_7["naive"] else "naive"
    return BacktestResult(
        n_points=n,
        n_origins=len(origins),
        first_origin=dates[origins[0]],
        last_origin=dates[origins[-1]],
        mase=mase,
        mase_1_7=mase_1_7,
        quantiles=quantiles,
        coverage=coverage,
        chosen=chosen,
    )


def _target_index(index: dict[date, int], dates: list[date], origin: date, h: int) -> int | None:
    """Exact day for 1-7 day horizons; for the 2-4 week ranges the first trading day within
    three days of the target (markets close on holidays)."""
    target = origin + timedelta(days=h)
    if h in POINT_HORIZONS:
        return index.get(target)
    for extra in range(4):
        found = index.get(target + timedelta(days=extra))
        if found is not None:
            return found
    return None


# ---- Serving ------------------------------------------------------------------------------------


@dataclass
class ForecastPoint:
    day: date
    horizon_days: int
    point: float | None
    low: float
    high: float


def make_forecast(
    dates: list[date], values: list[float], details: dict
) -> tuple[str, list[ForecastPoint], list[ForecastPoint]]:
    """Forecast from the last observation with the method and intervals chosen in the backtest.
    Returns (method, 1-7 day points, 2-4 week ranges)."""
    method = details.get("chosen", "naive")
    q = details.get("quantiles", {}).get(method, {})
    fit = fit_ets(values[-365:]) if method == "ets" else None
    last = dates[-1]
    points, ranges = [], []
    for h in POINT_HORIZONS + RANGE_HORIZONS:
        if str(h) not in q:
            continue
        lo_e, hi_e = q[str(h)]
        centre = predict(method, dates, values, h, fit)
        fp = ForecastPoint(
            day=last + timedelta(days=h),
            horizon_days=h,
            point=round(centre, 2) if h in POINT_HORIZONS else None,
            low=round(centre * math.exp(lo_e), 2),
            high=round(centre * math.exp(hi_e), 2),
        )
        (points if h in POINT_HORIZONS else ranges).append(fp)
    return method, points, ranges
