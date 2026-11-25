"""``terrabyte-import-legacy-prices``: load the 2025 prototype's Pune APMC price files.

The four Excel files in ``backend/legacy/datasets`` hold one row per day (2021-01-01 to
2025-05-27) for onion, potato, tomato and bhindi in Pune district. The market changes from day
to day inside each file, so every row is stored under its own market. The files came from
Agmarknet via the 2025 prototype; some values are fractional, i.e. the prototype averaged
several rows, and the onion/tomato files have no min/max columns (stored as empty).
"""

from __future__ import annotations

import argparse
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy.orm import Session

from terrabyte.config import BACKEND_DIR, get_settings
from terrabyte.db import Database
from terrabyte.prices import normalise as norm
from terrabyte.prices.store import PriceRow, UpsertResult, log_import, upsert_rows

LEGACY_DIR = BACKEND_DIR / "legacy" / "datasets"
LEGACY_FILES = (
    "Onion_Merged_with_distance.xlsx",
    "Potato_with_distances.xlsx",
    "Tomato_with_distances.xlsx",
    "Bhendi_with_distances.xlsx",
)
SOURCE = "legacy Pune APMC file (Agmarknet via 2025 prototype)"


def read_legacy_file(path: Path) -> tuple[list[PriceRow], list[str]]:
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows_iter = ws.iter_rows(values_only=True)
    header = [norm.clean_text(h) for h in next(rows_iter)]
    col = {name: i for i, name in enumerate(header)}
    out: list[PriceRow] = []
    errors: list[str] = []
    for n, values in enumerate(rows_iter, start=2):

        def get(name: str, values=values) -> object:
            i = col.get(name)
            return values[i] if i is not None and i < len(values) else None

        modal = norm.price(get("Modal Price (Rs./Quintal)"))
        day = norm.arrival_date(get("Price Date"))
        market = norm.market_name(get("Market Name"))
        if modal is None or day is None or not market:
            errors.append(f"{path.name} row {n}: missing date, market or modal price")
            continue
        out.append(
            PriceRow(
                state="Maharashtra",
                district=norm.clean_text(get("District Name")) or "Pune",
                market=market,
                commodity=norm.commodity_name(get("Commodity")),
                variety="",
                grade="",
                arrival_date=day,
                min_price=norm.price(get("Min Price (Rs./Quintal)")),
                max_price=norm.price(get("Max Price (Rs./Quintal)")),
                modal_price=modal,
            )
        )
    wb.close()
    return out, errors


def import_legacy(db: Session, directory: Path = LEGACY_DIR) -> UpsertResult:
    total = UpsertResult()
    for name in LEGACY_FILES:
        path = directory / name
        if not path.exists():
            total.errors.append(f"{name}: not found")
            continue
        rows, errors = read_legacy_file(path)
        result = upsert_rows(db, rows, SOURCE)
        total.created += result.created
        total.updated += result.updated
        total.skipped += result.skipped + len(errors)
        total.errors.extend(errors)
    log_import(db, "mandi_prices", f"{SOURCE}: {directory.name}", total)
    return total


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="terrabyte-import-legacy-prices")
    parser.add_argument("--dir", type=Path, default=LEGACY_DIR)
    args = parser.parse_args(argv)
    database = Database(get_settings().database_url)
    database.create_all()
    with database.session_factory() as db:
        result = import_legacy(db, args.dir)
    print(
        f"Created {result.created}, updated {result.updated}, skipped {result.skipped}"
        f" ({len(result.errors)} problems)."
    )


if __name__ == "__main__":  # pragma: no cover
    main()
