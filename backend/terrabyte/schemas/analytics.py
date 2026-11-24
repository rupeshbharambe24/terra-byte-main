"""Dashboard and analytics responses. Every number is computed from database rows."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from terrabyte.schemas.advisory import ConsultationOut
from terrabyte.schemas.common import MoneyOut
from terrabyte.schemas.market import OrderOut
from terrabyte.schemas.rental import BookingOut


class DayPoint(BaseModel):
    date: date
    count: int
    value: MoneyOut


class ResponseTimes(BaseModel):
    """Hours from a question being asked to the first expert reply."""

    responded: int
    median_hours: float | None
    average_hours: float | None


class FarmerDashboard(BaseModel):
    fields: int
    total_acres: float
    open_orders: int
    recent_orders: list[OrderOut]
    upcoming_bookings_count: int
    upcoming_bookings: list[BookingOut]
    open_consultations: int
    unread_notifications: int
    month: str
    month_income: MoneyOut
    month_expense: MoneyOut


class StockItem(BaseModel):
    id: int
    name: str
    unit: str
    stock: int


class TopProduct(BaseModel):
    name: str
    quantity: int
    revenue: MoneyOut


class VendorDashboard(BaseModel):
    products_total: int
    products_active: int
    low_stock: list[StockItem]
    out_of_stock: int
    orders_by_status: dict[str, int]
    open_orders: int
    revenue_total: MoneyOut
    revenue_this_month: MoneyOut
    month: str
    orders_last_30_days: list[DayPoint]
    top_products: list[TopProduct]
    recent_orders: list[OrderOut]


class EquipmentUse(BaseModel):
    equipment_id: int
    name: str
    booked_days: int
    days: int
    share: float


class HardwareDashboard(BaseModel):
    equipment_total: int
    equipment_active: int
    bookings_by_status: dict[str, int]
    pending_requests: int
    revenue_total: MoneyOut
    revenue_this_month: MoneyOut
    month: str
    utilisation: list[EquipmentUse]
    utilisation_overall: float | None
    requests_last_30_days: list[DayPoint]
    upcoming: list[BookingOut]


class ExpertDashboard(BaseModel):
    open_unassigned: int
    waiting_for_me: int
    answered_by_me: int
    closed_by_me: int
    response_times: ResponseTimes
    articles_published: int
    articles_draft: int
    recent: list[ConsultationOut]


class AdminAnalytics(BaseModel):
    users_by_role: dict[str, int]
    users_by_status: dict[str, int]
    pending_approvals: int
    new_users_last_30_days: list[DayPoint]
    orders_by_status: dict[str, int]
    orders_last_30_days: list[DayPoint]
    delivered_order_value: MoneyOut
    bookings_by_status: dict[str, int]
    completed_rental_value: MoneyOut
    consultations_by_status: dict[str, int]
    response_times: ResponseTimes
    forum_posts: int
    forum_replies: int
    open_reports: int
    hidden_items: int
    kvks: int
    articles_published: int
    products_active: int
    equipment_active: int


class ModelEvaluationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    model_name: str
    version: str
    dataset: str
    metric_name: str
    value: float
    evaluated_at: datetime
    details: dict[str, Any] | None
