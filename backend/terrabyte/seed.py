"""``terrabyte-seed``: idempotent demo data (test users for every role + starter listings).

Only the *users* are fake. Products and equipment are clearly labelled as listings entered by
demo vendors; their prices are vendor-set listing prices, not market data. A small walkthrough
(orders in different states, bookings, a consultation thread, forum posts, an expert article) is
created once, through the same service functions the API uses, and is authored by the demo users
and labelled "(demo)". No agronomic numbers (soil tests, yields, mandi prices, doses) are seeded,
and the KVK directory is left empty until the verified list is imported
(``terrabyte-import-kvk``).
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from terrabyte.config import BACKEND_DIR, get_settings
from terrabyte.db import Base, Database, utcnow
from terrabyte.models import (
    Booking,
    BookingStatus,
    Equipment,
    Field,
    ForumPost,
    ForumReply,
    ForumReport,
    KnowledgeArticle,
    Language,
    Order,
    PaymentMethod,
    Product,
    ProductCategory,
    RentalUnit,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.schemas.advisory import ConsultationIn, MessageIn
from terrabyte.schemas.market import OrderIn, OrderLineIn
from terrabyte.schemas.rental import BookingIn
from terrabyte.security import hash_password
from terrabyte.services import consultations as consultation_service
from terrabyte.services.bookings import change_booking_status, create_booking
from terrabyte.services.common import money
from terrabyte.services.ledger import record_booking_expense
from terrabyte.services.orders import change_order_status, place_orders
from terrabyte.timeutil import IST, today_ist

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
    counts["walkthrough"] = int(seed_walkthrough(db, users))
    return counts


def _product(db: Session, owner: User, name: str) -> Product:
    return db.scalars(
        select(Product).where(Product.vendor_id == owner.id, Product.name == name)
    ).one()


def _equipment(db: Session, owner: User, name: str) -> Equipment:
    return db.scalars(
        select(Equipment).where(Equipment.owner_id == owner.id, Equipment.name == name)
    ).one()


def _at(day: date, hour: int) -> datetime:
    return datetime.combine(day, time(hour), tzinfo=IST)


def seed_walkthrough(db: Session, users: dict[str, User]) -> bool:
    """Create the demo walkthrough once (skipped when the demo farmers already have orders)."""
    farmer, farmer2 = users["farmer_pune"], users["farmer_nashik"]
    if db.scalar(select(Order.id).where(Order.buyer_id.in_([farmer.id, farmer2.id])).limit(1)):
        return False
    v1, v2 = users["vendor_pune"], users["vendor_nashik"]
    h1, h2, expert = users["hardware_pune"], users["hardware_nashik"], users["expert"]
    address1 = "Demo address: Narayangaon, Tal. Junnar, Dist. Pune"
    address2 = "Demo address: Niphad, Dist. Nashik"

    def order(buyer: User, address: str, lines: list[tuple[Product, int]], note: str) -> Order:
        data = OrderIn(
            items=[OrderLineIn(product_id=p.id, quantity=q) for p, q in lines],
            delivery_address=address,
            payment_method=PaymentMethod.cod,
            note=note,
        )
        return place_orders(db, buyer, data)[0]

    # Marketplace: one order in each state of the fulfilment flow.
    o = order(farmer, address1, [(_product(db, v1, "Urea, neem-coated"), 2)], "Demo order")
    for action in ("accept", "ship", "deliver"):
        change_order_status(db, v1, o.id, action, None)  # delivered -> farm-accounts entry
    o = order(farmer, address1, [(_product(db, v1, "Onion seed (open-pollinated)"), 1)], "Demo")
    for action in ("accept", "ship"):
        change_order_status(db, v1, o.id, action, None)
    order(farmer, address1, [(_product(db, v2, "Neem oil 1500 ppm"), 2)], "Demo order")
    o = order(farmer2, address2, [(_product(db, v2, "Muriate of Potash (MOP)"), 1)], "Demo")
    change_order_status(db, v2, o.id, "accept", None)
    o = order(farmer2, address2, [(_product(db, v2, "Single Super Phosphate (SSP)"), 2)], "Demo")
    change_order_status(db, v2, o.id, "reject", "Demo: no delivery to this village this week")

    # Rentals: an accepted and a requested booking ahead, one completed rental in the past.
    tomorrow = today_ist() + timedelta(days=1)
    tractor = _equipment(db, h1, "Tractor 45 HP with rotavator and operator")
    b = create_booking(
        db,
        farmer,
        BookingIn(
            equipment_id=tractor.id,
            unit=RentalUnit.hour,
            start_at=_at(tomorrow, 8),
            end_at=_at(tomorrow, 11),
            note="Demo booking: rotavator for the road-side plot",
        ),
    )
    change_booking_status(db, h1, b.id, "accept", None)
    mini = _equipment(db, h2, "Mini tractor 20 HP for orchards")
    create_booking(
        db,
        farmer2,
        BookingIn(
            equipment_id=mini.id,
            unit=RentalUnit.day,
            start_at=_at(tomorrow + timedelta(days=2), 0),
            end_at=_at(tomorrow + timedelta(days=3), 0),
            note="Demo booking request",
        ),
    )
    sprayer = _equipment(db, h1, "Power sprayer (petrol engine)")
    past = today_ist() - timedelta(days=6)
    done = Booking(
        equipment_id=sprayer.id,
        farmer_id=farmer.id,
        start_at=_at(past, 0),
        end_at=_at(past + timedelta(days=1), 0),
        unit=RentalUnit.day,
        units=1,
        rate_inr=money(sprayer.rate_per_day_inr or 0),
        amount_inr=money(sprayer.rate_per_day_inr or 0),
        status=BookingStatus.completed,
        note="Demo booking (completed)",
        accepted_at=_at(past - timedelta(days=2), 10),
        completed_at=_at(past + timedelta(days=1), 9),
    )
    db.add(done)
    db.flush()
    record_booking_expense(db, done)
    db.commit()

    # Consultations: one answered thread, one open question waiting for an expert.
    upload_dir = get_settings().upload_dir
    c = consultation_service.create(
        db,
        farmer,
        ConsultationIn(
            crop="Onion",
            category="nutrient",
            question=(
                "(Demo question) Leaf tips are turning yellow in the well-side onion plot, a few "
                "weeks after transplanting. What should I check first?"
            ),
        ),
        upload_dir,
    )
    consultation_service.claim(db, expert, c.id)
    consultation_service.add_message(
        db,
        expert,
        c.id,
        MessageIn(
            body=(
                "(Demo reply from a test expert account, not agronomic advice.) Please tell me "
                "when you last irrigated and fertilised, whether the yellowing starts on older or "
                "younger leaves, and send a close photo of a few leaves. A recent soil test report "
                "would also help."
            )
        ),
        upload_dir,
    )
    consultation_service.create(
        db,
        farmer2,
        ConsultationIn(
            crop="Grape",
            category="disease",
            question=(
                "(Demo question) White powdery patches are appearing on some grape leaves after "
                "cloudy days. Can an expert tell me what to look for?"
            ),
        ),
        upload_dir,
    )

    # Expert knowledge: one published article (about using the platform) and one draft.
    db.add_all(
        [
            KnowledgeArticle(
                author_id=expert.id,
                title="How to ask a question that an expert can answer (demo article)",
                crop=None,
                body=(
                    "This is a demo article written by a test expert account.\n\n"
                    "When you ask a question, please include: the crop and its stage, which part "
                    "of the plant is affected and since when, what you applied recently "
                    "(irrigation, fertiliser, sprays), and clear photos of the whole plant and of "
                    "a close-up of the problem. If you have a Soil Health Card or a recent soil "
                    "test, mention it."
                ),
                published=True,
                published_at=utcnow(),
            ),
            KnowledgeArticle(
                author_id=expert.id,
                title="Draft: questions to ask before the rabi season (demo draft)",
                body="Demo draft. Not published, so farmers cannot see it yet.",
                published=False,
            ),
        ]
    )

    # Forum: two discussions with replies and one open report for the moderation queue.
    p1 = ForumPost(
        author_id=farmer.id,
        title="Sharing a rotavator booking near Narayangaon? (demo)",
        body="(Demo post) Is anyone nearby interested in sharing a rotavator booking next week?",
        category="equipment",
        crop=None,
    )
    p2 = ForumPost(
        author_id=farmer2.id,
        title="Soil testing lab near Niphad (demo)",
        body="(Demo post) Has anyone had their soil tested near Niphad? How long did it take?",
        category="soil_water",
    )
    p3 = ForumPost(
        author_id=farmer2.id,
        title="Selling used drip lateral rolls (demo)",
        body="(Demo post) Call me for used drip lateral rolls.",
        category="market",
    )
    db.add_all([p1, p2, p3])
    db.flush()
    db.add_all(
        [
            ForumReply(post_id=p1.id, author_id=farmer2.id, body="(Demo reply) Too far for me."),
            ForumReply(
                post_id=p2.id,
                author_id=expert.id,
                body="(Demo reply) Ask at your taluka agriculture office about Soil Health Card "
                "sampling in your village.",
            ),
            ForumReport(
                reporter_id=farmer.id,
                post_id=p3.id,
                reason="(Demo report) Advertisement, not a discussion.",
            ),
        ]
    )
    db.commit()
    return True


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
        "- `uv run terrabyte-seed --reset` **wipes the development database** and recreates it",
        "  with these accounts and the demo walkthrough (re-run `terrabyte-import-kvk` after it).",
        "- Starter products and equipment belong to the demo vendors. They are labelled as demo",
        "  listings; prices are vendor-entered listing prices, not market data.",
        "- The walkthrough (created once): orders in every state (delivered, shipped, placed,",
        "  accepted, rejected), an accepted and a requested equipment booking, one completed",
        "  rental, a consultation thread, an open question, an expert article, forum posts and",
        '  one open report. All of it is authored by the demo users and marked "(demo)".',
        "- The KVK directory is empty until the verified list is imported with",
        "  `uv run terrabyte-import-kvk <file.json>`.",
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
        help="DROP every table and recreate the database with fresh demo data (development only)",
    )
    parser.add_argument("--no-write", action="store_true", help="do not write DEMO_ACCOUNTS.md")
    args = parser.parse_args(argv)

    settings = get_settings()
    database = Database(settings.database_url)
    if args.reset:
        if settings.is_production:
            print("--reset is refused when ENVIRONMENT=production.", file=sys.stderr)
            raise SystemExit(2)
        from terrabyte import models  # noqa: F401  (registers every table)

        Base.metadata.drop_all(database.engine)
        print("Dropped all tables (--reset).")
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
