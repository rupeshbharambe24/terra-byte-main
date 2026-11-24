from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_serializer

from terrabyte.models import ProductCategory


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    body: str | None
    link: str | None
    read_at: datetime | None
    created_at: datetime


class NotificationPage(BaseModel):
    items: list[NotificationOut]
    unread: int


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    vendor_name: str
    name: str
    category: ProductCategory
    brand: str | None
    unit: str
    price_inr: Decimal
    stock: int
    description: str | None
    image_path: str | None

    @field_serializer("price_inr")
    def _money(self, v: Decimal) -> float:
        return round(float(v), 2)


class EquipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    owner_name: str
    name: str
    type: str
    rate_per_hour_inr: Decimal | None
    rate_per_day_inr: Decimal | None
    district: str | None
    description: str | None
    image_path: str | None

    @field_serializer("rate_per_hour_inr", "rate_per_day_inr")
    def _money(self, v: Decimal | None) -> float | None:
        return None if v is None else round(float(v), 2)


class UploadOut(BaseModel):
    path: str
    url: str
    width: int
    height: int
    bytes: int
