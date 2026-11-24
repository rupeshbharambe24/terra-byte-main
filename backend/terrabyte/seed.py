"""``terrabyte-seed``: idempotent demo data (test users for every role + starter listings).

Only the *users* are fake. Products and equipment are clearly labelled as listings entered by
demo vendors; their prices are vendor-set listing prices, not market data. No agronomic numbers
(soil tests, yields, mandi prices) are seeded.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from terrabyte.config import BACKEND_DIR, get_settings
from terrabyte.db import Database, utcnow
from terrabyte.models import (
    Equipment,
    Field,
    Language,
    Product,
    ProductCategory,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.security import hash_password

DEMO_PASSWORD = "Demo@12345"
DEMO_NOTE = "Demo listing entered by a seeded test vendor; the price is set by the vendor."


@dataclass
class DemoUser:
    key: str
    name: str
    phone: str
    email: str
    role: UserRole
    status: UserStatus
    district: str
    village: str | None = None
    lat: float | None = None
    lon: float | None = None
    organization: str | None = None
    qualifications: str | None = None
    language: Language = Language.en
    fields: list[dict] = field(default_factory=list)


DEMO_USERS: list[DemoUser] = [
    DemoUser(
        "admin",
        "Demo Admin",
        "9000000001",
        "admin@demo.terrabyte.local",
        UserRole.admin,
        UserStatus.approved,
        "Pune",
    ),
    DemoUser(
        "farmer_pune",
        "Ramesh Shinde (demo)",
        "9000000011",
        "farmer1@demo.terrabyte.local",
        UserRole.farmer,
        UserStatus.approved,
        "Pune",
        "Narayangaon",
        19.1167,
        73.9667,
        language=Language.mr,
        fields=[
            {
                "name": "Well-side plot",
                "area_acres": 2.5,
                "soil_type": "Medium black",
                "irrigation_source": "Open well",
                "current_crop": "Onion",
                "sowing_date": date(2026, 11, 10),
                "lat": 19.1172,
                "lon": 73.9651,
            },
            {
                "name": "Road-side plot",
                "area_acres": 1.5,
                "soil_type": "Medium black",
                "irrigation_source": "Drip (well)",
                "current_crop": "Tomato",
                "sowing_date": date(2026, 10, 20),
                "lat": 19.1150,
                "lon": 73.9702,
            },
        ],
    ),
    DemoUser(
        "farmer_nashik",
        "Sunita Jadhav (demo)",
        "9000000012",
        "farmer2@demo.terrabyte.local",
        UserRole.farmer,
        UserStatus.approved,
        "Nashik",
        "Niphad",
        20.0800,
        74.1100,
        language=Language.hi,
        fields=[
            {
                "name": "Grape block",
                "area_acres": 3.0,
                "soil_type": "Medium black",
                "irrigation_source": "Drip (canal + farm pond)",
                "current_crop": "Grape",
                "sowing_date": None,
                "lat": 20.0812,
                "lon": 74.1085,
            },
        ],
    ),
    DemoUser(
        "vendor_pune",
        "Shivneri Krishi Kendra (demo)",
        "9000000021",
        "vendor1@demo.terrabyte.local",
        UserRole.vendor,
        UserStatus.approved,
        "Pune",
        "Junnar",
        organization="Shivneri Krishi Kendra (demo vendor)",
    ),
    DemoUser(
        "vendor_nashik",
        "Godavari Agro Inputs (demo)",
        "9000000022",
        "vendor2@demo.terrabyte.local",
        UserRole.vendor,
        UserStatus.approved,
        "Nashik",
        "Pimpalgaon Baswant",
        organization="Godavari Agro Inputs (demo vendor)",
    ),
    DemoUser(
        "vendor_pending",
        "Pending Agro Traders (demo)",
        "9000000023",
        "vendor3@demo.terrabyte.local",
        UserRole.vendor,
        UserStatus.pending,
        "Ahilyanagar",
        "Rahuri",
        organization="Pending Agro Traders (demo vendor awaiting approval)",
    ),
    DemoUser(
        "hardware_pune",
        "Junnar Tractor Hire (demo)",
        "9000000031",
        "hardware1@demo.terrabyte.local",
        UserRole.hardware_vendor,
        UserStatus.approved,
        "Pune",
        "Junnar",
        organization="Junnar Tractor Hire (demo)",
    ),
    DemoUser(
        "hardware_nashik",
        "Niphad Farm Machinery (demo)",
        "9000000032",
        "hardware2@demo.terrabyte.local",
        UserRole.hardware_vendor,
        UserStatus.approved,
        "Nashik",
        "Niphad",
        organization="Niphad Farm Machinery (demo)",
    ),
    DemoUser(
        "expert",
        "Dr. Anjali Patil (demo expert)",
        "9000000041",
        "expert@demo.terrabyte.local",
        UserRole.expert,
        UserStatus.approved,
        "Pune",
        organization="Demo account - not a real institution",
        qualifications="Demo expert account for testing consultations.",
    ),
]

# (owner key, name, category, unit, price, stock)
DEMO_PRODUCTS = [
    ("vendor_pune", "Urea, neem-coated", ProductCategory.fertilizer, "45 kg bag", "266.50", 120),
    ("vendor_pune", "DAP 18-46-0", ProductCategory.fertilizer, "50 kg bag", "1350.00", 60),
    (
        "vendor_pune",
        "Onion seed (open-pollinated)",
        ProductCategory.seeds,
        "500 g pack",
        "1100.00",
        40,
    ),
    ("vendor_pune", "Knapsack sprayer, manual", ProductCategory.tools, "16 L unit", "1800.00", 15),
    (
        "vendor_nashik",
        "Muriate of Potash (MOP)",
        ProductCategory.fertilizer,
        "50 kg bag",
        "1700.00",
        50,
    ),
    (
        "vendor_nashik",
        "Single Super Phosphate (SSP)",
        ProductCategory.fertilizer,
        "50 kg bag",
        "550.00",
        80,
    ),
    ("vendor_nashik", "Neem oil 1500 ppm", ProductCategory.pesticide, "1 L bottle", "450.00", 35),
    ("vendor_nashik", "Drip lateral pipe 16 mm", ProductCategory.tools, "100 m roll", "950.00", 25),
]

# (owner key, name, type, rate/hour, rate/day, district)
DEMO_EQUIPMENT = [
    (
        "hardware_pune",
        "Tractor 45 HP with rotavator and operator",
        "tractor",
        "900",
        "6000",
        "Pune",
    ),
    ("hardware_pune", "Power sprayer (petrol engine)", "sprayer", None, "500", "Pune"),
    ("hardware_pune", "Self-propelled reaper", "harvester", "1200", None, "Pune"),
    (
        "hardware_nashik",
        "Tractor 35 HP with cultivator and operator",
        "tractor",
        "800",
        "5500",
        "Nashik",
    ),
    ("hardware_nashik", "Mini tractor 20 HP for orchards", "tractor", "700", "5000", "Nashik"),
]


def _upsert_user(db: Session, spec: DemoUser, reset: bool) -> tuple[User, bool]:
    user = db.scalar(select(User).where(User.phone == spec.phone))
    created = user is None
    if user is None:
        user = User(phone=spec.phone, password_hash=hash_password(DEMO_PASSWORD))
        db.add(user)
    elif reset:
        user.password_hash = hash_password(DEMO_PASSWORD)
    if created or reset:
        user.name = spec.name
        user.email = spec.email
        user.role = spec.role
        user.status = spec.status
        user.status_reason = None
        user.status_changed_at = utcnow() if spec.status != UserStatus.pending else None
        user.preferred_language = spec.language
        user.organization = spec.organization
        user.qualifications = spec.qualifications
        user.state = "Maharashtra"
        user.district = spec.district
        user.village = spec.village
        user.lat = spec.lat
        user.lon = spec.lon
    db.flush()
    return user, created


def seed(db: Session, reset: bool = False) -> dict[str, int]:
    counts = {"users": 0, "fields": 0, "products": 0, "equipment": 0}
    users: dict[str, User] = {}
    for spec in DEMO_USERS:
        user, created = _upsert_user(db, spec, reset)
        users[spec.key] = user
        counts["users"] += int(created)
        for f in spec.fields:
            exists = db.scalar(
                select(Field.id).where(Field.owner_id == user.id, Field.name == f["name"])
            )
            if exists is None:
                db.add(Field(owner_id=user.id, **f))
                counts["fields"] += 1

    for key, name, category, unit, price, stock in DEMO_PRODUCTS:
        vendor = users[key]
        if db.scalar(
            select(Product.id).where(Product.vendor_id == vendor.id, Product.name == name)
        ):
            continue
        db.add(
            Product(
                vendor_id=vendor.id,
                name=name,
                category=category,
                unit=unit,
                price_inr=Decimal(price),
                stock=stock,
                description=DEMO_NOTE,
                active=True,
            )
        )
        counts["products"] += 1

    for key, name, type_, per_hour, per_day, district in DEMO_EQUIPMENT:
        owner = users[key]
        if db.scalar(
            select(Equipment.id).where(Equipment.owner_id == owner.id, Equipment.name == name)
        ):
            continue
        db.add(
            Equipment(
                owner_id=owner.id,
                name=name,
                type=type_,
                district=district,
                description=DEMO_NOTE,
                rate_per_hour_inr=Decimal(per_hour) if per_hour else None,
                rate_per_day_inr=Decimal(per_day) if per_day else None,
                active=True,
            )
        )
        counts["equipment"] += 1

    db.commit()
    return counts


def demo_accounts_markdown() -> str:
    lines = [
        "# Demo accounts",
        "",
        "Created by `uv run terrabyte-seed` (run from `backend/`). These are **test accounts**",
        "**only**; they exist so every role can be tried locally. Never reuse these credentials",
        "anywhere real.",
        "",
        f"All accounts use the password **`{DEMO_PASSWORD}`**. Log in with the mobile number or "
        "the email.",
        "",
        "| Role | Name | Mobile | Email | Status | District |",
        "|---|---|---|---|---|---|",
    ]
    for u in DEMO_USERS:
        lines.append(
            f"| {u.role.value} | {u.name} | {u.phone} | {u.email} | {u.status.value} | "
            f"{u.district} |"
        )
    lines += [
        "",
        "- The pending vendor (`9000000023`) cannot log in until an admin approves it on",
        "  *Admin → Vendor approvals*; use it to try the approval flow.",
        "- `uv run terrabyte-seed --reset` restores the passwords and statuses above.",
        "- Starter products and equipment belong to the demo vendors. They are labelled as demo",
        "  listings; prices are vendor-entered listing prices, not market data.",
        "- Create a real admin with `uv run terrabyte-admin create-admin` (admins cannot",
        "  self-register).",
        "",
    ]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Seed TerraByte demo accounts and listings.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="reset demo account passwords, statuses and profile fields",
    )
    parser.add_argument("--no-write", action="store_true", help="do not write DEMO_ACCOUNTS.md")
    args = parser.parse_args(argv)

    settings = get_settings()
    database = Database(settings.database_url)
    database.create_all()
    with database.session_factory() as db:
        counts = seed(db, reset=args.reset)
    created = ", ".join(f"{v} {k}" for k, v in counts.items())
    print(f"Seed complete (new: {created}).\n")
    print(demo_accounts_markdown())
    if not args.no_write:
        out = Path(BACKEND_DIR) / "DEMO_ACCOUNTS.md"
        out.write_text(demo_accounts_markdown())
        print(f"Wrote {out}")


if __name__ == "__main__":  # pragma: no cover
    main()
