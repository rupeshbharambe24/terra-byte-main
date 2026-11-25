"""Upsert mandi price rows and log each import run."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from terrabyte.db import utcnow
from terrabyte.models import DataImport, MandiPrice
from terrabyte.prices import normalise as norm


@dataclass
class PriceRow:
    state: str
    district: str
    market: str
    commodity: str
    variety: str
    grade: str
    arrival_date: date
    min_price: Decimal | None
    max_price: Decimal | None
    modal_price: Decimal

    @property
    def key(self) -> tuple[str, str, str, str, date]:
        return (self.market, self.commodity, self.variety, self.grade, self.arrival_date)


@dataclass
class UpsertResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)


def row_from_record(record: dict[str, object]) -> PriceRow | None:
    """Build a row from a data.gov.in record (either resource; field names differ in case)."""
    r = {str(k).lower(): v for k, v in record.items()}
    modal = norm.price(r.get("modal_price"))
    day = norm.arrival_date(r.get("arrival_date"))
    market = norm.market_name(r.get("market"))
    commodity = norm.commodity_name(r.get("commodity"))
    if modal is None or day is None or not market or not commodity:
        return None
    low = norm.price(r.get("min_price"))
    high = norm.price(r.get("max_price"))
    # Reject obviously inconsistent rows (typo-sized max values, modal outside the range).
    if low is not None and high is not None and not (low <= modal <= high):
        return None
    return PriceRow(
        state=norm.clean_text(r.get("state")),
        district=norm.clean_text(r.get("district")),
        market=market,
        commodity=commodity,
        variety=norm.clean_text(r.get("variety")),
        grade=norm.clean_text(r.get("grade")),
        arrival_date=day,
        min_price=low,
        max_price=high,
        modal_price=modal,
    )


def upsert_rows(db: Session, rows: list[PriceRow], source: str) -> UpsertResult:
    result = UpsertResult()
    unique: dict[tuple, PriceRow] = {}
    for row in rows:
        unique[row.key] = row  # last one wins inside a batch
    result.skipped += len(rows) - len(unique)
    for row in unique.values():
        existing = db.scalar(
            select(MandiPrice).where(
                MandiPrice.market == row.market,
                MandiPrice.commodity == row.commodity,
                MandiPrice.variety == row.variety,
                MandiPrice.grade == row.grade,
                MandiPrice.arrival_date == row.arrival_date,
            )
        )
        values = {
            "state": row.state,
            "district": row.district,
            "min_price": row.min_price,
            "max_price": row.max_price,
            "modal_price": row.modal_price,
            "source": source[:120],
            "fetched_at": utcnow(),
        }
        if existing is None:
            db.add(
                MandiPrice(
                    market=row.market,
                    commodity=row.commodity,
                    variety=row.variety,
                    grade=row.grade,
                    arrival_date=row.arrival_date,
                    **values,
                )
            )
            result.created += 1
        else:
            changed = any(getattr(existing, k) != v for k, v in values.items() if k != "fetched_at")
            for k, v in values.items():
                setattr(existing, k, v)
            if changed:
                result.updated += 1
    db.flush()
    return result


def log_import(db: Session, kind: str, source: str, result: UpsertResult) -> DataImport:
    entry = DataImport(
        kind=kind,
        source=source[:255],
        created=result.created,
        updated=result.updated,
        skipped=result.skipped,
        errors=result.errors[:200] or None,
    )
    db.add(entry)
    db.commit()
    return entry
