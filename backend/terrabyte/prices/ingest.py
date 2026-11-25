"""``terrabyte-ingest-prices``: fetch Agmarknet mandi prices from data.gov.in into ``mandi_prices``.

Two resources (both GODL-India, attribution "data.gov.in / Agmarknet"):

* current daily prices ``9ef84268-d588-465a-a308-a864a43d0070`` (today's rows only);
* variety-wise daily history ``35985678-0d79-46b4-9ed6-6f13308a1d24`` (2009 to about T-2 days).

The API key comes from ``DATA_GOV_IN_API_KEY`` in ``backend/.env``. Without one the public
sample key is used: it returns at most 10 rows per call and is often throttled (HTTP 429), so
calls are paced and retried with backoff. Every run is logged in ``data_imports``.

Examples::

    uv run terrabyte-ingest-prices current --commodity Onion --commodity Tomato
    uv run terrabyte-ingest-prices history --commodity Onion --market "Pune(Manjri)" --days 120
    uv run terrabyte-ingest-prices series --days 120     # all series in reference/price_series.json
"""

from __future__ import annotations

import argparse
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from terrabyte.config import get_settings
from terrabyte.db import Database
from terrabyte.prices.store import PriceRow, UpsertResult, log_import, row_from_record, upsert_rows
from terrabyte.timeutil import today_ist

log = logging.getLogger("terrabyte.prices")

API_BASE = "https://api.data.gov.in/resource/"
CURRENT_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"
HISTORY_RESOURCE = "35985678-0d79-46b4-9ed6-6f13308a1d24"
# Public sample key published on data.gov.in (10 rows per call, heavily rate limited).
SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"  # noqa: S105
SERIES_FILE = Path(__file__).resolve().parent.parent / "reference" / "price_series.json"

Fetcher = Callable[[str], dict[str, Any]]


class FetchError(RuntimeError):
    pass


def http_fetch(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "terrabyte-ingest/0.1"})  # noqa: S310
    try:
        with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise FetchError(f"HTTP {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise FetchError(str(exc)) from exc


@dataclass
class DataGovClient:
    api_key: str | None
    fetch: Fetcher = http_fetch
    sleep: Callable[[float], None] = time.sleep
    pause_s: float = 1.5
    max_retries: int = 5

    @property
    def using_sample_key(self) -> bool:
        return not self.api_key

    @property
    def page_size(self) -> int:
        return 10 if self.using_sample_key else 1000

    def _url(self, resource: str, params: dict[str, str]) -> str:
        query = {
            "api-key": self.api_key or SAMPLE_KEY,
            "format": "json",
            **params,
        }
        return API_BASE + resource + "?" + urllib.parse.urlencode(query)

    def get_page(self, resource: str, params: dict[str, str]) -> dict[str, Any]:
        url = self._url(resource, params)
        for attempt in range(self.max_retries):
            try:
                data = self.fetch(url)
                if self.pause_s:
                    self.sleep(self.pause_s)
                return data
            except FetchError as exc:
                wait = 45.0 * (attempt + 1) if "429" in str(exc) else 5.0 * (attempt + 1)
                log.warning("data.gov.in call failed (%s); retrying in %.0f s", exc, wait)
                if attempt + 1 == self.max_retries:
                    raise
                self.sleep(wait)
        raise FetchError("unreachable")  # pragma: no cover

    def records(
        self,
        resource: str,
        filters: dict[str, str],
        sort: dict[str, str] | None = None,
        max_rows: int = 5000,
        stop: Callable[[list[dict[str, Any]]], bool] | None = None,
    ):
        """Yield pages of records until the result set, ``max_rows`` or ``stop(page)`` ends it."""
        offset = 0
        while offset < max_rows:
            params = {"offset": str(offset), "limit": str(self.page_size)}
            params.update({f"filters[{k}]": v for k, v in filters.items()})
            params.update({f"sort[{k}]": v for k, v in (sort or {}).items()})
            data = self.get_page(resource, params)
            page = data.get("records") or []
            if not page:
                return
            yield page
            offset += len(page)
            total = data.get("total")
            if (isinstance(total, int) and offset >= total) or (stop and stop(page)):
                return


def _rows(records: list[dict[str, Any]]) -> tuple[list[PriceRow], int]:
    rows, bad = [], 0
    for record in records:
        row = row_from_record(record)
        if row is None:
            bad += 1
        else:
            rows.append(row)
    return rows, bad


def ingest_current(
    db: Session, client: DataGovClient, state: str, commodities: list[str], max_rows: int
) -> UpsertResult:
    total = UpsertResult()
    targets = commodities or [""]
    for commodity in targets:
        filters = {"state.keyword": state}
        if commodity:
            filters["commodity"] = commodity
        records: list[dict[str, Any]] = []
        try:
            for page in client.records(CURRENT_RESOURCE, filters, max_rows=max_rows):
                records.extend(page)
        except FetchError as exc:
            total.errors.append(f"current {commodity or 'all'}: {exc}")
        rows, bad = _rows(records)
        result = upsert_rows(db, rows, "data.gov.in current daily prices")
        total.created += result.created
        total.updated += result.updated
        total.skipped += result.skipped + bad
    label = ", ".join(commodities) or "all commodities"
    log_import(db, "mandi_prices", f"data.gov.in current: {state}: {label}", total)
    return total


def ingest_history(
    db: Session,
    client: DataGovClient,
    state: str,
    commodity: str,
    market: str | None,
    district: str | None,
    since: date,
    max_rows: int,
) -> UpsertResult:
    filters = {"State": state, "Commodity": commodity}
    if district:
        filters["District"] = district
    if market:
        filters["Market"] = market
    records: list[dict[str, Any]] = []
    result = UpsertResult()

    def older_than_since(page: list[dict[str, Any]]) -> bool:
        rows, _ = _rows(page)
        return bool(rows) and min(r.arrival_date for r in rows) < since

    try:
        for page in client.records(
            HISTORY_RESOURCE,
            filters,
            sort={"Arrival_Date": "desc"},
            max_rows=max_rows,
            stop=older_than_since,
        ):
            records.extend(page)
    except FetchError as exc:
        result.errors.append(f"history {commodity} {market or district or ''}: {exc}")
    rows, bad = _rows(records)
    rows = [r for r in rows if r.arrival_date >= since]
    upserted = upsert_rows(db, rows, "data.gov.in variety-wise daily prices")
    result.created, result.updated = upserted.created, upserted.updated
    result.skipped = upserted.skipped + bad
    where = market or district or state
    log_import(
        db, "mandi_prices", f"data.gov.in history: {commodity} @ {where} since {since}", result
    )
    return result


def load_series(path: Path = SERIES_FILE) -> list[dict[str, str]]:
    return json.loads(path.read_text(encoding="utf-8"))["series"]


def main(argv: list[str] | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(prog="terrabyte-ingest-prices", description=__doc__)
    sub = parser.add_subparsers(dest="mode", required=True)
    cur = sub.add_parser("current", help="today's prices (current daily resource)")
    cur.add_argument("--state", default="Maharashtra")
    cur.add_argument("--commodity", action="append", default=[])
    cur.add_argument("--max-rows", type=int, default=2000)
    his = sub.add_parser("history", help="recent history of one series (variety-wise resource)")
    his.add_argument("--state", default="Maharashtra")
    his.add_argument("--commodity", required=True)
    his.add_argument("--market")
    his.add_argument("--district")
    his.add_argument("--days", type=int, default=120)
    his.add_argument("--max-rows", type=int, default=1500)
    ser = sub.add_parser("series", help="history for every series in reference/price_series.json")
    ser.add_argument("--days", type=int, default=120)
    ser.add_argument("--max-rows", type=int, default=1500)
    args = parser.parse_args(argv)

    settings = get_settings()
    client = DataGovClient(api_key=settings.data_gov_in_api_key)
    if client.using_sample_key:
        log.warning(
            "DATA_GOV_IN_API_KEY is not set: using the public sample key (10 rows per call)."
        )
    database = Database(settings.database_url)
    database.create_all()
    with database.session_factory() as db:
        if args.mode == "current":
            results = [ingest_current(db, client, args.state, args.commodity, args.max_rows)]
        elif args.mode == "history":
            since = today_ist() - timedelta(days=args.days)
            results = [
                ingest_history(
                    db,
                    client,
                    args.state,
                    args.commodity,
                    args.market,
                    args.district,
                    since,
                    args.max_rows,
                )
            ]
        else:
            since = today_ist() - timedelta(days=args.days)
            results = []
            for s in load_series():
                res = ingest_history(
                    db,
                    client,
                    s.get("state", "Maharashtra"),
                    s["commodity"],
                    s.get("market"),
                    s.get("district"),
                    since,
                    args.max_rows,
                )
                print(f"{s['commodity']} @ {s.get('market')}: +{res.created} ~{res.updated}")
                results.append(res)
    created = sum(r.created for r in results)
    updated = sum(r.updated for r in results)
    errors = [e for r in results for e in r.errors]
    print(f"Created {created}, updated {updated}; {len(errors)} error(s).")
    for e in errors:
        print(f"  - {e}")


if __name__ == "__main__":  # pragma: no cover
    main()
