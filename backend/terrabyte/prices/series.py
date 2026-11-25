"""Turn stored mandi rows into one daily price series per (market, commodity)."""

from __future__ import annotations

import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from terrabyte.models import MandiPrice


@dataclass
class PricePoint:
    day: date
    modal: float
    low: float | None
    high: float | None


@dataclass
class Series:
    market: str
    commodity: str
    variety: str
    district: str
    state: str
    points: list[PricePoint] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)

    @property
    def dates(self) -> list[date]:
        return [p.day for p in self.points]

    @property
    def values(self) -> list[float]:
        return [p.modal for p in self.points]

    @property
    def last_date(self) -> date | None:
        return self.points[-1].day if self.points else None


def _median(values: list[float]) -> float | None:
    return float(statistics.median(values)) if values else None


def load_series(
    db: Session, market: str, commodity: str, since: date | None = None
) -> Series | None:
    """One value per day: the dominant variety (most rows in the last year of data), median
    across its grades. Returns None if the market/commodity has no rows."""
    stmt = select(MandiPrice).where(MandiPrice.market == market, MandiPrice.commodity == commodity)
    rows = list(db.scalars(stmt.order_by(MandiPrice.arrival_date)))
    if not rows:
        return None
    last = rows[-1].arrival_date
    recent = [r for r in rows if r.arrival_date >= last - timedelta(days=365)]
    variety = Counter(r.variety for r in recent).most_common(1)[0][0]
    by_day: dict[date, list[MandiPrice]] = defaultdict(list)
    for r in rows:
        if r.variety == variety and (since is None or r.arrival_date >= since):
            by_day[r.arrival_date].append(r)
    series = Series(
        market=market,
        commodity=commodity,
        variety=variety,
        district=rows[-1].district,
        state=rows[-1].state,
        sources=sorted({r.source for r in rows}),
    )
    for day in sorted(by_day):
        group = by_day[day]
        series.points.append(
            PricePoint(
                day=day,
                modal=_median([float(r.modal_price) for r in group]) or 0.0,
                low=_median([float(r.min_price) for r in group if r.min_price is not None]),
                high=_median([float(r.max_price) for r in group if r.max_price is not None]),
            )
        )
    return series


def list_series(db: Session, commodity: str | None = None, district: str | None = None):
    """(market, commodity, district, state, rows, first date, last date) for every series."""
    stmt = select(
        MandiPrice.market,
        MandiPrice.commodity,
        func.max(MandiPrice.district),
        func.max(MandiPrice.state),
        func.count(),
        func.min(MandiPrice.arrival_date),
        func.max(MandiPrice.arrival_date),
    ).group_by(MandiPrice.market, MandiPrice.commodity)
    if commodity:
        stmt = stmt.where(MandiPrice.commodity == commodity)
    if district:
        stmt = stmt.where(func.lower(MandiPrice.district) == district.lower())
    return list(db.execute(stmt.order_by(MandiPrice.commodity, MandiPrice.market)))
