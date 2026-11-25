"""Mandi prices from our database (Agmarknet via data.gov.in + the imported Pune history),
MSP from official PIB releases, and backtested short-term forecasts."""

from __future__ import annotations

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import and_, func, select

from terrabyte.errors import ApiError
from terrabyte.models import DataImport, Field, MandiPrice
from terrabyte.prices.evaluate import latest_evaluation
from terrabyte.prices.forecast import STALE_AFTER_DAYS, make_forecast
from terrabyte.prices.reference import commodity_for_crop, msp_for_commodity
from terrabyte.prices.series import list_series, load_series
from terrabyte.schemas.prices import (
    CommodityOut,
    ForecastOut,
    ForecastPointOut,
    ForecastSkill,
    HistoryOut,
    HistoryPoint,
    LatestPricesOut,
    MspForCommodity,
    MspOut,
    MyPricesOut,
    PriceImportOut,
    PriceRowOut,
    SeriesOut,
)
from terrabyte.security import AdminUser, CurrentUser, DbSession
from terrabyte.timeutil import today_ist

router = APIRouter(tags=["prices"])

PRICE_STALE_DAYS = 7
NO_MSP_NOTE = (
    "No MSP is announced for this commodity (most vegetables and fruits have none); "
    "its price is set by the market."
)


def _row_out(r: MandiPrice) -> PriceRowOut:
    days_old = (today_ist() - r.arrival_date).days
    return PriceRowOut(
        market=r.market,
        district=r.district,
        state=r.state,
        commodity=r.commodity,
        variety=r.variety,
        grade=r.grade,
        arrival_date=r.arrival_date,
        min_price=float(r.min_price) if r.min_price is not None else None,
        max_price=float(r.max_price) if r.max_price is not None else None,
        modal_price=float(r.modal_price),
        source=r.source,
        days_old=days_old,
        stale=days_old > PRICE_STALE_DAYS,
    )


def latest_rows(
    db: DbSession,
    commodities: list[str] | None = None,
    district: str | None = None,
    market: str | None = None,
    limit: int = 200,
) -> list[MandiPrice]:
    """Every row on the latest arrival date of each (market, commodity)."""
    last = select(
        MandiPrice.market.label("m"),
        MandiPrice.commodity.label("c"),
        func.max(MandiPrice.arrival_date).label("d"),
    ).group_by(MandiPrice.market, MandiPrice.commodity)
    if commodities:
        last = last.where(MandiPrice.commodity.in_(commodities))
    if district:
        last = last.where(func.lower(MandiPrice.district) == district.lower())
    if market:
        last = last.where(MandiPrice.market == market)
    sub = last.subquery()
    stmt = (
        select(MandiPrice)
        .join(
            sub,
            and_(
                MandiPrice.market == sub.c.m,
                MandiPrice.commodity == sub.c.c,
                MandiPrice.arrival_date == sub.c.d,
            ),
        )
        .order_by(MandiPrice.arrival_date.desc(), MandiPrice.commodity, MandiPrice.market)
        .limit(limit)
    )
    return list(db.scalars(stmt))


@router.get("/prices/commodities", response_model=list[CommodityOut])
def commodities(_user: CurrentUser, db: DbSession) -> list[CommodityOut]:
    stmt = (
        select(
            MandiPrice.commodity,
            func.count(func.distinct(MandiPrice.market)),
            func.max(MandiPrice.arrival_date),
        )
        .group_by(MandiPrice.commodity)
        .order_by(MandiPrice.commodity)
    )
    return [CommodityOut(commodity=c, markets=n, last_date=d) for c, n, d in db.execute(stmt)]


@router.get("/prices/series", response_model=list[SeriesOut])
def series(
    _user: CurrentUser,
    db: DbSession,
    commodity: str | None = None,
    district: str | None = None,
) -> list[SeriesOut]:
    return [
        SeriesOut(market=m, commodity=c, district=d, state=s, rows=n, first_date=f, last_date=l_)
        for m, c, d, s, n, f, l_ in list_series(db, commodity, district)
    ]


@router.get("/prices/latest", response_model=LatestPricesOut)
def latest(
    _user: CurrentUser,
    db: DbSession,
    commodity: str | None = None,
    district: str | None = None,
    market: str | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> LatestPricesOut:
    rows = latest_rows(db, [commodity] if commodity else None, district, market, limit)
    items = [_row_out(r) for r in rows]
    return LatestPricesOut(items=items, as_of=max((r.arrival_date for r in items), default=None))


@router.get("/prices/history", response_model=HistoryOut)
def history(
    _user: CurrentUser,
    db: DbSession,
    market: str,
    commodity: str,
    days: Annotated[int, Query(ge=7, le=3650)] = 365,
) -> HistoryOut:
    full = load_series(db, market, commodity)
    if full is None:
        raise ApiError(404, "no_price_data", "No prices for this market and commodity.")
    since = full.last_date - timedelta(days=days) if full.last_date else None
    points = [p for p in full.points if since is None or p.day >= since]
    return HistoryOut(
        market=market,
        commodity=commodity,
        variety=full.variety,
        district=full.district,
        points=[HistoryPoint(date=p.day, modal=p.modal, min=p.low, max=p.high) for p in points],
        sources=full.sources,
    )


@router.get("/prices/forecast", response_model=ForecastOut)
def forecast(_user: CurrentUser, db: DbSession, market: str, commodity: str) -> ForecastOut:
    full = load_series(db, market, commodity)
    if full is None or not full.points:
        return ForecastOut(status="no_data", market=market, commodity=commodity)
    last = full.points[-1]
    days_old = (today_ist() - last.day).days
    base = {
        "market": market,
        "commodity": commodity,
        "variety": full.variety,
        "last_date": last.day,
        "last_price": last.modal,
        "days_old": days_old,
    }
    if days_old > STALE_AFTER_DAYS:
        return ForecastOut(status="stale", **base)
    evaluation = latest_evaluation(db, market, commodity)
    if evaluation is None or not evaluation.details:
        return ForecastOut(status="not_evaluated", **base)
    details = evaluation.details
    method, points, ranges = make_forecast(full.dates, full.values, details)
    mase = details["mase_1_7"]
    coverage = details.get("coverage_80", {}).get(method)
    return ForecastOut(
        status="ok",
        method=method,
        points=[ForecastPointOut(date=p.day, **_fp(p)) for p in points],
        ranges=[ForecastPointOut(date=p.day, **_fp(p)) for p in ranges],
        skill=ForecastSkill(
            mase_naive=mase["naive"],
            mase_seasonal_naive=mase["seasonal_naive"],
            mase_ets=mase["ets"],
            coverage_80=coverage if coverage == coverage else None,  # NaN -> None
            n_origins=details["n_origins"],
            first_origin=details["first_origin"],
            last_origin=details["last_origin"],
            evaluated_at=evaluation.evaluated_at,
        ),
        **base,
    )


def _fp(p) -> dict:
    return {"horizon_days": p.horizon_days, "point": p.point, "low": p.low, "high": p.high}


@router.get("/prices/msp", response_model=MspForCommodity)
def msp(_user: CurrentUser, commodity: str) -> MspForCommodity:
    rows = msp_for_commodity(commodity)
    return MspForCommodity(
        commodity=commodity,
        has_msp=bool(rows),
        rows=[MspOut.model_validate(r) for r in rows],
        note=None if rows else NO_MSP_NOTE,
    )


@router.get("/prices/mine", response_model=MyPricesOut)
def my_prices(user: CurrentUser, db: DbSession) -> MyPricesOut:
    """Latest prices for the crops on the user's fields, in their district (if it has data)."""
    crops = sorted(
        {
            c
            for c in db.scalars(
                select(Field.current_crop).where(
                    Field.owner_id == user.id, Field.current_crop.is_not(None)
                )
            )
            if c
        }
    )
    commodities = sorted({c for c in (commodity_for_crop(x) for x in crops) if c})
    rows: list[MandiPrice] = []
    if commodities:
        if user.district:
            rows = latest_rows(db, commodities, district=user.district, limit=30)
        if not rows:
            rows = latest_rows(db, commodities, limit=30)
    elif user.district:
        rows = latest_rows(db, None, district=user.district, limit=30)
    items = [_row_out(r) for r in rows]
    return MyPricesOut(
        crops=crops,
        district=user.district,
        items=items,
        as_of=max((r.arrival_date for r in items), default=None),
    )


@router.get("/admin/price-imports", response_model=list[PriceImportOut])
def price_imports(_admin: AdminUser, db: DbSession) -> list[PriceImportOut]:
    rows = db.scalars(
        select(DataImport)
        .where(DataImport.kind == "mandi_prices")
        .order_by(DataImport.imported_at.desc(), DataImport.id.desc())
        .limit(50)
    )
    return [
        PriceImportOut(
            id=r.id,
            source=r.source,
            created=r.created,
            updated=r.updated,
            skipped=r.skipped,
            errors=r.errors,
            imported_at=r.imported_at,
        )
        for r in rows
    ]
