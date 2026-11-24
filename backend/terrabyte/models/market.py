from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from terrabyte.db import Base, TimestampMixin, UTCDateTime, utcnow
from terrabyte.models.enums import (
    OrderStatus,
    PaymentMethod,
    ProductCategory,
    db_enum,
)

Money = Numeric(12, 2)


class Product(TimestampMixin, Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[ProductCategory] = mapped_column(db_enum(ProductCategory), index=True)
    brand: Mapped[str | None] = mapped_column(String(120))
    unit: Mapped[str] = mapped_column(String(40))
    price_inr: Mapped[Decimal] = mapped_column(Money)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str | None] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)


class Order(TimestampMixin, Base):
    """One order per vendor. Unit prices and totals are always computed on the server."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[OrderStatus] = mapped_column(
        db_enum(OrderStatus), default=OrderStatus.placed, index=True
    )
    total_inr: Mapped[Decimal] = mapped_column(Money)
    delivery_address: Mapped[str] = mapped_column(Text)
    payment_method: Mapped[PaymentMethod] = mapped_column(db_enum(PaymentMethod))
    note: Mapped[str | None] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
    accepted_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    shipped_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    delivered_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    cancelled_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), index=True
    )
    product_name: Mapped[str] = mapped_column(String(160))  # snapshot at order time
    unit: Mapped[str] = mapped_column(String(40))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price_inr: Mapped[Decimal] = mapped_column(Money)  # copied from Product server-side
    line_total_inr: Mapped[Decimal] = mapped_column(Money)

    order: Mapped[Order] = relationship(back_populates="items")
