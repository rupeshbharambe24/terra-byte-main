"""Indian Standard Time helpers (IST has no daylight saving, so a fixed offset is exact)."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30), "IST")


def now_utc() -> datetime:
    return datetime.now(UTC)


def today_ist() -> date:
    return datetime.now(IST).date()


def ist_date(moment: datetime) -> date:
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment.astimezone(IST).date()


def ist_day_start(day: date) -> datetime:
    """00:00 IST on ``day`` as an aware UTC datetime."""
    return datetime.combine(day, time(0), tzinfo=IST).astimezone(UTC)


def month_bounds(day: date) -> tuple[date, date]:
    """First day of ``day``'s month and first day of the next month."""
    first = day.replace(day=1)
    nxt = (first + timedelta(days=32)).replace(day=1)
    return first, nxt
