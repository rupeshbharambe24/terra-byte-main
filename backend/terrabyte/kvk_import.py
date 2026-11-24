"""``terrabyte-import-kvk <file.json>``: load the verified KVK directory into the database.

The file is a JSON array of objects (or ``{"kvks": [...]}``) with the fields ``name``,
``district``, ``state`` (required) and optionally ``host_organisation``, ``address``,
``pincode``, ``phone``, ``email``, ``website``, ``lat``, ``lon``, ``source_url`` and
``verified_on`` (YYYY-MM-DD). Rows are matched on name + district + state (case-insensitive):
existing rows are updated, new ones created. Invalid rows are skipped and reported. Every run
is logged and shown to admins on the KVK import status page.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from terrabyte.config import get_settings
from terrabyte.db import Database
from terrabyte.models import KVK, DataImport
from terrabyte.schemas.advisory import KVKIn


@dataclass
class ImportResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)


def load_rows(raw: Any) -> list[Any]:
    if isinstance(raw, dict) and isinstance(raw.get("kvks"), list):
        return raw["kvks"]
    if isinstance(raw, list):
        return raw
    raise ValueError('Expected a JSON array of KVK objects (or {"kvks": [...]}).')


def import_kvks(db: Session, rows: list[Any], source: str, dry_run: bool = False) -> ImportResult:
    result = ImportResult()
    seen: set[tuple[str, str, str]] = set()
    for index, row in enumerate(rows, start=1):
        try:
            data = KVKIn.model_validate(row)
        except ValidationError as exc:
            result.skipped += 1
            problems = "; ".join(
                f"{'.'.join(str(p) for p in e['loc']) or 'row'}: {e['msg']}" for e in exc.errors()
            )
            result.errors.append(f"row {index}: {problems}")
            continue
        key = (data.name.lower(), data.district.lower(), data.state.lower())
        if key in seen:
            result.skipped += 1
            result.errors.append(f"row {index}: duplicate of an earlier row ({data.name})")
            continue
        seen.add(key)
        existing = db.scalar(
            select(KVK).where(
                func.lower(KVK.name) == key[0],
                func.lower(KVK.district) == key[1],
                func.lower(KVK.state) == key[2],
            )
        )
        values = data.to_columns()
        if existing is None:
            db.add(KVK(**values))
            result.created += 1
        else:
            for k, v in values.items():
                setattr(existing, k, v)
            result.updated += 1
    if dry_run:
        db.rollback()
        return result
    db.add(
        DataImport(
            kind="kvk",
            source=source[:255],
            created=result.created,
            updated=result.updated,
            skipped=result.skipped,
            errors=result.errors[:200] or None,
        )
    )
    db.commit()
    return result


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="terrabyte-import-kvk", description="Import the KVK directory from a JSON file."
    )
    parser.add_argument("file", type=Path, help="JSON file (array of KVK objects)")
    parser.add_argument("--dry-run", action="store_true", help="validate only, write nothing")
    args = parser.parse_args(argv)

    try:
        rows = load_rows(json.loads(args.file.read_text(encoding="utf-8")))
    except (OSError, ValueError) as exc:
        print(f"Cannot read {args.file}: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc

    database = Database(get_settings().database_url)
    database.create_all()
    with database.session_factory() as db:
        result = import_kvks(db, rows, args.file.name, dry_run=args.dry_run)
    prefix = "Dry run: would create" if args.dry_run else "Created"
    print(f"{prefix} {result.created}, updated {result.updated}, skipped {result.skipped}.")
    for error in result.errors:
        print(f"  - {error}", file=sys.stderr)
    raise SystemExit(1 if result.skipped and not (result.created or result.updated) else 0)


if __name__ == "__main__":  # pragma: no cover
    main()
