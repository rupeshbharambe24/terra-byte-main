"""Role dashboards and admin analytics: aggregates computed from the database on request."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from terrabyte.db import utcnow
from terrabyte.models import (
    KVK,
    Booking,
    BookingStatus,
    Consultation,
    ConsultationStatus,
    Equipment,
    Field,
    ForumPost,
    ForumReply,
    ForumReport,
    KnowledgeArticle,
    LedgerEntry,
    LedgerType,
    ModelEvaluation,
    ModerationStatus,
    Notification,
    Order,
    OrderStatus,
    Product,
    ReportStatus,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.pagination import Paging, page_rows
from terrabyte.routers.market import orders_out
from terrabyte.routers.rentals import bookings_out
from terrabyte.schemas.analytics import (
    AdminAnalytics,
    ExpertDashboard,
    FarmerDashboard,
    HardwareDashboard,
    ModelEvaluationOut,
    StockItem,
    VendorDashboard,
)
from terrabyte.schemas.common import Page
from terrabyte.security import AdminUser, DbSession, require_role
from terrabyte.services import analytics as an
from terrabyte.services import consultations as consult_svc
from terrabyte.services.common import money
from terrabyte.timeutil import month_bounds, today_ist

router = APIRouter(tags=["dashboards"])

FarmerUser = Annotated[User, Depends(require_role(UserRole.farmer))]
VendorUser = Annotated[User, Depends(require_role(UserRole.vendor))]
OwnerUser = Annotated[User, Depends(require_role(UserRole.hardware_vendor))]
ExpertUser = Annotated[User, Depends(require_role(UserRole.expert))]

B = BookingStatus


def _count(db: DbSession, *where) -> int:
    return db.scalar(select(func.count()).where(*where)) or 0


@router.get("/dashboard/farmer", response_model=FarmerDashboard)
def farmer_dashboard(farmer: FarmerUser, db: DbSession) -> FarmerDashboard:
    now = utcnow()
    field_count, acres = db.execute(
        select(func.count(Field.id), func.coalesce(func.sum(Field.area_acres), 0.0)).where(
            Field.owner_id == farmer.id
        )
    ).one()
    open_orders = select(Order).where(Order.buyer_id == farmer.id, Order.status.in_(an.OPEN_ORDER))
    recent_orders = list(
        db.scalars(open_orders.order_by(Order.created_at.desc(), Order.id.desc()).limit(3))
    )
    upcoming = select(Booking).where(
        Booking.farmer_id == farmer.id,
        Booking.status.in_((B.requested, B.accepted)),
        Booking.end_at > now,
    )
    first, nxt = month_bounds(today_ist())
    month_rows = db.execute(
        select(LedgerEntry.type, func.sum(LedgerEntry.amount_inr))
        .where(
            LedgerEntry.user_id == farmer.id,
            LedgerEntry.entry_date >= first,
            LedgerEntry.entry_date < nxt,
        )
        .group_by(LedgerEntry.type)
    ).all()
    totals = {t: money(v or 0) for t, v in month_rows}
    return FarmerDashboard(
        fields=field_count,
        total_acres=round(float(acres), 2),
        open_orders=_count(db, Order.buyer_id == farmer.id, Order.status.in_(an.OPEN_ORDER)),
        recent_orders=orders_out(db, recent_orders, farmer),
        upcoming_bookings_count=_count(
            db,
            Booking.farmer_id == farmer.id,
            Booking.status.in_((B.requested, B.accepted)),
            Booking.end_at > now,
        ),
        upcoming_bookings=bookings_out(
            db, list(db.scalars(upcoming.order_by(Booking.start_at).limit(3))), farmer
        ),
        open_consultations=_count(
            db,
            Consultation.farmer_id == farmer.id,
            Consultation.status != ConsultationStatus.closed,
        ),
        unread_notifications=_count(
            db, Notification.user_id == farmer.id, Notification.read_at.is_(None)
        ),
        month=first.strftime("%Y-%m"),
        month_income=totals.get(LedgerType.income, money(0)),
        month_expense=totals.get(LedgerType.expense, money(0)),
    )


@router.get("/dashboard/vendor", response_model=VendorDashboard)
def vendor_dashboard(vendor: VendorUser, db: DbSession) -> VendorDashboard:
    label, month_start, month_end = an.month_label()
    _, since = an.window_start()
    delivered = db.execute(
        select(Order.total_inr, Order.delivered_at).where(
            Order.vendor_id == vendor.id, Order.status == OrderStatus.delivered
        )
    ).all()
    placed = db.execute(
        select(Order.created_at, Order.total_inr).where(
            Order.vendor_id == vendor.id, Order.created_at >= since
        )
    ).all()
    recent = list(
        db.scalars(
            select(Order)
            .where(Order.vendor_id == vendor.id)
            .order_by(Order.created_at.desc(), Order.id.desc())
            .limit(5)
        )
    )
    by_status = an.count_by(db, Order.status, Order.vendor_id == vendor.id)
    return VendorDashboard(
        products_total=_count(db, Product.vendor_id == vendor.id),
        products_active=_count(db, Product.vendor_id == vendor.id, Product.active.is_(True)),
        low_stock=[
            StockItem(id=p.id, name=p.name, unit=p.unit, stock=p.stock)
            for p in an.low_stock(db, vendor.id)
        ],
        out_of_stock=_count(
            db, Product.vendor_id == vendor.id, Product.active.is_(True), Product.stock == 0
        ),
        orders_by_status=by_status,
        open_orders=sum(by_status.get(s.value, 0) for s in an.OPEN_ORDER),
        revenue_total=an.sum_money(t for t, _ in delivered),
        revenue_this_month=an.sum_money(
            t for t, d in delivered if d is not None and month_start <= d < month_end
        ),
        month=label,
        orders_last_30_days=an.day_series(placed),
        top_products=an.top_products(db, vendor.id),
        recent_orders=orders_out(db, recent, vendor),
    )


@router.get("/dashboard/hardware", response_model=HardwareDashboard)
def hardware_dashboard(owner: OwnerUser, db: DbSession) -> HardwareDashboard:
    label, month_start, month_end = an.month_label()
    _, since = an.window_start()
    mine = Booking.equipment_id.in_(select(Equipment.id).where(Equipment.owner_id == owner.id))
    completed = db.execute(
        select(Booking.amount_inr, Booking.completed_at).where(mine, Booking.status == B.completed)
    ).all()
    requests = db.execute(
        select(Booking.created_at, Booking.amount_inr).where(mine, Booking.created_at >= since)
    ).all()
    upcoming = list(
        db.scalars(
            select(Booking)
            .where(mine, Booking.status.in_((B.requested, B.accepted)), Booking.end_at > utcnow())
            .order_by(Booking.start_at)
            .limit(5)
        )
    )
    uses, overall = an.utilisation(db, owner.id)
    by_status = an.count_by(db, Booking.status, mine)
    return HardwareDashboard(
        equipment_total=_count(db, Equipment.owner_id == owner.id),
        equipment_active=_count(db, Equipment.owner_id == owner.id, Equipment.active.is_(True)),
        bookings_by_status=by_status,
        pending_requests=by_status.get(B.requested.value, 0),
        revenue_total=an.sum_money(a for a, _ in completed),
        revenue_this_month=an.sum_money(
            a for a, d in completed if d is not None and month_start <= d < month_end
        ),
        month=label,
        utilisation=uses,
        utilisation_overall=overall,
        requests_last_30_days=an.day_series(requests),
        upcoming=bookings_out(db, upcoming, owner),
    )


@router.get("/dashboard/expert", response_model=ExpertDashboard)
def expert_dashboard(expert: ExpertUser, db: DbSession) -> ExpertDashboard:
    C = ConsultationStatus
    recent = list(
        db.scalars(
            consult_svc.visible_to(expert)
            .where(Consultation.status != C.closed)
            .order_by(Consultation.updated_at.desc(), Consultation.id.desc())
            .limit(5)
        )
    )
    mine = Consultation.expert_id == expert.id
    return ExpertDashboard(
        open_unassigned=_count(db, Consultation.expert_id.is_(None), Consultation.status == C.open),
        waiting_for_me=_count(db, mine, Consultation.status == C.assigned),
        answered_by_me=_count(db, mine, Consultation.status == C.answered),
        closed_by_me=_count(db, mine, Consultation.status == C.closed),
        response_times=an.consultation_response_times(db, mine),
        articles_published=_count(
            db, KnowledgeArticle.author_id == expert.id, KnowledgeArticle.published.is_(True)
        ),
        articles_draft=_count(
            db, KnowledgeArticle.author_id == expert.id, KnowledgeArticle.published.is_(False)
        ),
        recent=consult_svc.to_out(db, recent),
    )


@router.get("/admin/analytics", response_model=AdminAnalytics)
def admin_analytics(_admin: AdminUser, db: DbSession) -> AdminAnalytics:
    _, since = an.window_start()
    users_new = db.scalars(select(User.created_at).where(User.created_at >= since)).all()
    orders_recent = db.execute(
        select(Order.created_at, Order.total_inr).where(Order.created_at >= since)
    ).all()
    hidden = _count(db, ForumPost.moderation_status == ModerationStatus.hidden) + _count(
        db, ForumReply.moderation_status == ModerationStatus.hidden
    )
    return AdminAnalytics(
        users_by_role=an.count_by(db, User.role),
        users_by_status=an.count_by(db, User.status),
        pending_approvals=_count(db, User.status == UserStatus.pending),
        new_users_last_30_days=an.day_series((c, None) for c in users_new),
        orders_by_status=an.count_by(db, Order.status),
        orders_last_30_days=an.day_series(orders_recent),
        delivered_order_value=money(
            db.scalar(
                select(func.coalesce(func.sum(Order.total_inr), 0)).where(
                    Order.status == OrderStatus.delivered
                )
            )
            or 0
        ),
        bookings_by_status=an.count_by(db, Booking.status),
        completed_rental_value=money(
            db.scalar(
                select(func.coalesce(func.sum(Booking.amount_inr), 0)).where(
                    Booking.status == B.completed
                )
            )
            or 0
        ),
        consultations_by_status=an.count_by(db, Consultation.status),
        response_times=an.consultation_response_times(db),
        forum_posts=_count(db, ForumPost.moderation_status == ModerationStatus.published),
        forum_replies=_count(db, ForumReply.moderation_status == ModerationStatus.published),
        open_reports=_count(db, ForumReport.status == ReportStatus.open),
        hidden_items=hidden,
        kvks=db.scalar(select(func.count()).select_from(KVK)) or 0,
        articles_published=_count(db, KnowledgeArticle.published.is_(True)),
        products_active=_count(db, Product.active.is_(True)),
        equipment_active=_count(db, Equipment.active.is_(True)),
    )


@router.get("/admin/model-evaluations", response_model=Page[ModelEvaluationOut])
def model_evaluations(_admin: AdminUser, db: DbSession, paging: Paging) -> Page[ModelEvaluationOut]:
    """Held-out evaluation results written by our evaluation scripts (empty until Phase 3)."""
    stmt = select(ModelEvaluation).order_by(
        ModelEvaluation.model_name, ModelEvaluation.evaluated_at.desc()
    )
    rows, total = page_rows(db, stmt, paging)
    return Page(
        items=[ModelEvaluationOut.model_validate(r) for r in rows],
        total=total,
        limit=paging.limit,
        offset=paging.offset,
    )
