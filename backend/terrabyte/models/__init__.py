"""All ORM models. Importing this package registers every table on ``Base.metadata``."""

from terrabyte.models.advisory import KVK, Consultation, ConsultationMessage
from terrabyte.models.community import ForumPost, ForumReply, ForumReport, Notification
from terrabyte.models.data import LedgerEntry, MandiPrice, ModelEvaluation
from terrabyte.models.enums import (
    BookingStatus,
    ConsultationStatus,
    Language,
    LedgerType,
    ModerationStatus,
    OrderStatus,
    PaymentMethod,
    ProductCategory,
    RentalUnit,
    ReportStatus,
    UserRole,
    UserStatus,
)
from terrabyte.models.farm import Field, SoilTest
from terrabyte.models.market import Order, OrderItem, Product
from terrabyte.models.rental import Booking, Equipment
from terrabyte.models.user import User

__all__ = [
    "KVK",
    "Booking",
    "BookingStatus",
    "Consultation",
    "ConsultationMessage",
    "ConsultationStatus",
    "Equipment",
    "Field",
    "ForumPost",
    "ForumReply",
    "ForumReport",
    "Language",
    "LedgerEntry",
    "LedgerType",
    "MandiPrice",
    "ModelEvaluation",
    "ModerationStatus",
    "Notification",
    "Order",
    "OrderItem",
    "OrderStatus",
    "PaymentMethod",
    "Product",
    "ProductCategory",
    "RentalUnit",
    "ReportStatus",
    "SoilTest",
    "User",
    "UserRole",
    "UserStatus",
]
