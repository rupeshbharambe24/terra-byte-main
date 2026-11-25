"""``terrabyte-admin``: administrative commands (admins cannot self-register)."""

from __future__ import annotations

import argparse
import getpass
import os
import sys

from pydantic import TypeAdapter, ValidationError

from terrabyte.config import get_settings
from terrabyte.db import Database, utcnow
from terrabyte.errors import ApiError
from terrabyte.models import User, UserRole, UserStatus
from terrabyte.schemas.common import IndianMobile
from terrabyte.security import hash_password
from terrabyte.services.users import ensure_unique


def _create_admin(args: argparse.Namespace) -> int:
    try:
        phone = TypeAdapter(IndianMobile).validate_python(args.phone)
    except ValidationError:
        print("Invalid 10-digit Indian mobile number.", file=sys.stderr)
        return 2
    password = os.environ.get("TERRABYTE_ADMIN_PASSWORD") or getpass.getpass("Password: ")
    if len(password) < 8:
        print("Password must be at least 8 characters.", file=sys.stderr)
        return 2
    database = Database(get_settings().database_url)
    database.create_all()
    with database.session_factory() as db:
        try:
            ensure_unique(db, phone, args.email)
        except ApiError as exc:
            print(exc.detail, file=sys.stderr)
            return 1
        db.add(
            User(
                name=args.name,
                phone=phone,
                email=args.email.lower() if args.email else None,
                password_hash=hash_password(password),
                role=UserRole.admin,
                status=UserStatus.approved,
                status_changed_at=utcnow(),
            )
        )
        db.commit()
    print(f"Admin {args.name} ({phone}) created.")
    return 0


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="terrabyte-admin")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("create-admin", help="create an admin account")
    p.add_argument("--name", required=True)
    p.add_argument("--phone", required=True)
    p.add_argument("--email")
    p.set_defaults(func=_create_admin)
    args = parser.parse_args(argv)
    raise SystemExit(args.func(args))


if __name__ == "__main__":  # pragma: no cover
    main()
