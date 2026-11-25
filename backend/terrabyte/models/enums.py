"""Enumerations shared by models and schemas (stored as their string values)."""

from enum import StrEnum

from sqlalchemy import Enum as SAEnum


class UserRole(StrEnum):
    farmer = "farmer"
    vendor = "vendor"
    hardware_vendor = "hardware_vendor"
    expert = "expert"
    admin = "admin"


class UserStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"


class Language(StrEnum):
    en = "en"
    hi = "hi"
    mr = "mr"


class ProductCategory(StrEnum):
    seeds = "seeds"
    fertilizer = "fertilizer"
    pesticide = "pesticide"
    tools = "tools"
    other = "other"


class OrderStatus(StrEnum):
    placed = "placed"
    accepted = "accepted"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    rejected = "rejected"


class PaymentMethod(StrEnum):
    cod = "cod"
    upi_on_delivery = "upi_on_delivery"


class RentalUnit(StrEnum):
    hour = "hour"
    day = "day"


class BookingStatus(StrEnum):
    requested = "requested"
    accepted = "accepted"
    rejected = "rejected"
    cancelled = "cancelled"
    completed = "completed"


class ConsultationStatus(StrEnum):
    open = "open"
    assigned = "assigned"
    answered = "answered"
    closed = "closed"


class ModerationStatus(StrEnum):
    published = "published"
    hidden = "hidden"
    removed = "removed"


class ReportStatus(StrEnum):
    open = "open"
    resolved = "resolved"
    dismissed = "dismissed"


class LedgerType(StrEnum):
    income = "income"
    expense = "expense"


def db_enum(enum_cls: type[StrEnum]) -> SAEnum:
    """Portable string column constrained to the enum's values (no native DB enum type)."""
    return SAEnum(
        enum_cls,
        native_enum=False,
        validate_strings=True,
        length=32,
        values_callable=lambda e: [m.value for m in e],
    )
