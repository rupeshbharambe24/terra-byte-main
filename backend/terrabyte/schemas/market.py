from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from terrabyte.models import OrderStatus, PaymentMethod, ProductCategory
from terrabyte.schemas.common import BlankToNone, MoneyIn, MoneyOut, Reason

Name = Annotated[str, Field(min_length=2, max_length=160)]
OptText = Annotated[str | None, Field(max_length=2000), BlankToNone]


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    vendor_name: str
    vendor_district: str | None
    name: str
    category: ProductCategory
    brand: str | None
    unit: str
    price_inr: MoneyOut
    stock: int
    description: str | None
    image_path: str | None
    active: bool
    created_at: datetime
    updated_at: datetime


class ProductIn(BaseModel):
    name: Name
    category: ProductCategory
    brand: Annotated[str | None, Field(max_length=120), BlankToNone] = None
    unit: Annotated[str, Field(min_length=1, max_length=40)]
    price_inr: MoneyIn
    stock: Annotated[int, Field(ge=0, le=1_000_000)]
    description: OptText = None
    image_path: Annotated[str | None, Field(max_length=255), BlankToNone] = None
    active: bool = True

    @field_validator("name", "unit")
    @classmethod
    def _squash(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("Cannot be empty")
        return v


class ProductUpdate(BaseModel):
    name: Name | None = None
    category: ProductCategory | None = None
    brand: Annotated[str | None, Field(max_length=120), BlankToNone] = None
    unit: Annotated[str | None, Field(min_length=1, max_length=40)] = None
    price_inr: MoneyIn | None = None
    stock: Annotated[int | None, Field(ge=0, le=1_000_000)] = None
    description: OptText = None
    image_path: Annotated[str | None, Field(max_length=255), BlankToNone] = None
    active: bool | None = None


class OrderLineIn(BaseModel):
    product_id: int
    quantity: Annotated[int, Field(ge=1, le=1000)]


class OrderIn(BaseModel):
    items: Annotated[list[OrderLineIn], Field(min_length=1, max_length=50)]
    delivery_address: Annotated[str, Field(min_length=5, max_length=500)]
    payment_method: PaymentMethod
    note: Annotated[str | None, Field(max_length=500), BlankToNone] = None


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int | None
    product_name: str
    unit: str
    quantity: int
    unit_price_inr: MoneyOut
    line_total_inr: MoneyOut


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    buyer_id: int
    buyer_name: str
    buyer_phone: str | None = None  # only shown to the vendor of an active order
    vendor_id: int
    vendor_name: str
    status: OrderStatus
    total_inr: MoneyOut
    delivery_address: str
    payment_method: PaymentMethod
    note: str | None
    status_reason: str | None
    created_at: datetime
    updated_at: datetime
    accepted_at: datetime | None
    shipped_at: datetime | None
    delivered_at: datetime | None
    cancelled_at: datetime | None
    rejected_at: datetime | None
    items: list[OrderItemOut]


class OrderAction(BaseModel):
    reason: Reason = None
