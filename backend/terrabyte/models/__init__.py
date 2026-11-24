"""All ORM models. Importing this package registers every table on ``Base.metadata``."""

from terrabyte.models.advisory import KVK, Consultation, ConsultationMessage, KnowledgeArticle
from terrabyte.models.community import ForumPost, ForumReply, ForumReport, Notification
from terrabyte.models.data import DataImport, LedgerEntry, MandiPrice, ModelEvaluation
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
    "DataImport",
    "Equipment",
    "Field",
    "KnowledgeArticle",
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
