"""Marketplace: product catalogue, vendor product management and orders."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from terrabyte.errors import ApiError
from terrabyte.models import (
    Order,
    OrderStatus,
    Product,
    ProductCategory,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.pagination import Paging, page_rows
from terrabyte.schemas.common import Page
from terrabyte.schemas.market import (
    OrderAction,
    OrderIn,
    OrderItemOut,
    OrderOut,
    ProductIn,
    ProductOut,
    ProductUpdate,
)
from terrabyte.security import CurrentUser, DbSession, SettingsDep, require_role
from terrabyte.services.common import apply_patch, money
from terrabyte.services.orders import change_order_status, get_order_for, place_orders
from terrabyte.services.uploads import check_owned_image

router = APIRouter(tags=["marketplace"])

VendorUser = Annotated[User, Depends(require_role(UserRole.vendor))]
FarmerUser = Annotated[User, Depends(require_role(UserRole.farmer))]
OrderViewer = Annotated[
    User, Depends(require_role(UserRole.farmer, UserRole.vendor, UserRole.admin))
]


def product_out(product: Product, vendor: User) -> ProductOut:
    return ProductOut.model_validate(
        {
            **{c.key: getattr(product, c.key) for c in Product.__table__.columns},
            "vendor_name": vendor.name,
            "vendor_district": vendor.district,
        }
    )


def orders_out(db: Session, orders: list[Order], viewer: User) -> list[OrderOut]:
    ids = {o.buyer_id for o in orders} | {o.vendor_id for o in orders}
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(ids)))} if ids else {}
    out = []
    for o in orders:
        buyer, vendor = users.get(o.buyer_id), users.get(o.vendor_id)
        # The vendor (and admin) needs the buyer's number to deliver; nobody else sees it.
        show_phone = viewer.id == o.vendor_id or viewer.role == UserRole.admin
        out.append(
            OrderOut.model_validate(
                {
                    **{c.key: getattr(o, c.key) for c in Order.__table__.columns},
                    "buyer_name": buyer.name if buyer else "",
                    "buyer_phone": buyer.phone if (buyer and show_phone) else None,
                    "vendor_name": vendor.name if vendor else "",
                    "items": [OrderItemOut.model_validate(i) for i in o.items],
                }
            )
        )
    return out


# ---- Catalogue ---------------------------------------------------------------------------


@router.get("/products", response_model=Page[ProductOut])
def list_products(
    _user: CurrentUser,
    db: DbSession,
    paging: Paging,
    q: Annotated[str | None, Query(max_length=100)] = None,
    category: ProductCategory | None = None,
    district: Annotated[str | None, Query(max_length=80)] = None,
    in_stock: bool = False,
) -> Page[ProductOut]:
    stmt = (
        select(Product, User)
        .join(User, User.id == Product.vendor_id)
        .where(
            Product.active.is_(True),
            User.status == UserStatus.approved,
            User.role == UserRole.vendor,
        )
    )
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.name).like(like),
                func.lower(func.coalesce(Product.brand, "")).like(like),
                func.lower(User.name).like(like),
            )
        )
    if category is not None:
        stmt = stmt.where(Product.category == category)
    if district and district.strip():
        stmt = stmt.where(func.lower(User.district) == district.strip().lower())
    if in_stock:
        stmt = stmt.where(Product.stock > 0)
    rows, total = page_rows(db, stmt.order_by(Product.name, Product.id), paging)
    return Page(
        items=[product_out(p, v) for p, v in rows],
        total=total,
        limit=paging.limit,
        offset=paging.offset,
    )


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, user: CurrentUser, db: DbSession) -> ProductOut:
    row = db.execute(
        select(Product, User)
        .join(User, User.id == Product.vendor_id)
        .where(Product.id == product_id)
    ).first()
    if row is None:
        raise ApiError(404, "not_found", "Product not found.")
    product, vendor = row
    visible = product.active and vendor.status == UserStatus.approved
    if not visible and user.id != vendor.id and user.role != UserRole.admin:
        raise ApiError(404, "not_found", "Product not found.")
    return product_out(product, vendor)


# ---- Vendor product management ---------------------------------------------------------------


@router.get("/vendor/products", response_model=Page[ProductOut])
def vendor_products(
    vendor: VendorUser,
    db: DbSession,
    paging: Paging,
    q: Annotated[str | None, Query(max_length=100)] = None,
    active: bool | None = None,
) -> Page[ProductOut]:
    stmt = select(Product).where(Product.vendor_id == vendor.id)
    if q and q.strip():
        stmt = stmt.where(func.lower(Product.name).like(f"%{q.strip().lower()}%"))
    if active is not None:
        stmt = stmt.where(Product.active.is_(active))
    rows, total = page_rows(db, stmt.order_by(Product.active.desc(), Product.name), paging)
    return Page(
        items=[product_out(p, vendor) for p in rows],
        total=total,
        limit=paging.limit,
        offset=paging.offset,
    )


@router.post("/vendor/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductIn, vendor: VendorUser, db: DbSession, settings: SettingsDep
) -> ProductOut:
    check_owned_image(data.image_path, vendor.id, settings.upload_dir)
    product = Product(vendor_id=vendor.id, **data.model_dump())
    product.price_inr = money(data.price_inr)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_out(product, vendor)


@router.patch("/vendor/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    vendor: VendorUser,
    db: DbSession,
    settings: SettingsDep,
) -> ProductOut:
    product = db.get(Product, product_id)
    if product is None or product.vendor_id != vendor.id:
        raise ApiError(404, "not_found", "Product not found.")
    changes = data.model_dump(exclude_unset=True)
    if changes.get("image_path"):
        check_owned_image(changes["image_path"], vendor.id, settings.upload_dir)
    if changes.get("price_inr") is not None:
        changes["price_inr"] = money(changes["price_inr"])
    apply_patch(product, changes, {"name", "category", "unit", "price_inr", "stock", "active"})
    db.commit()
    db.refresh(product)
    return product_out(product, vendor)


# ---- Orders ----------------------------------------------------------------------------------


@router.post("/orders", response_model=list[OrderOut], status_code=status.HTTP_201_CREATED)
def create_orders(data: OrderIn, farmer: FarmerUser, db: DbSession) -> list[OrderOut]:
    """Place a cart. Items from different vendors become separate orders."""
    return orders_out(db, place_orders(db, farmer, data), farmer)


@router.get("/orders", response_model=Page[OrderOut])
def list_orders(
    user: OrderViewer,
    db: DbSession,
    paging: Paging,
    status_: Annotated[list[OrderStatus] | None, Query(alias="status")] = None,
) -> Page[OrderOut]:
    stmt = select(Order)
    if user.role == UserRole.farmer:
        stmt = stmt.where(Order.buyer_id == user.id)
    elif user.role == UserRole.vendor:
        stmt = stmt.where(Order.vendor_id == user.id)
    if status_:
        stmt = stmt.where(Order.status.in_(status_))
    rows, total = page_rows(db, stmt.order_by(Order.created_at.desc(), Order.id.desc()), paging)
    return Page(
        items=orders_out(db, rows, user), total=total, limit=paging.limit, offset=paging.offset
    )


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: OrderViewer, db: DbSession) -> OrderOut:
    return orders_out(db, [get_order_for(db, user, order_id)], user)[0]


@router.post("/orders/{order_id}/{action}", response_model=OrderOut)
def order_action(
    order_id: int,
    action: str,
    user: OrderViewer,
    db: DbSession,
    data: Annotated[OrderAction | None, Body()] = None,
) -> OrderOut:
    """``accept``/``reject``/``ship``/``deliver`` (vendor) or ``cancel`` (buyer, while placed)."""
    order = change_order_status(db, user, order_id, action, data.reason if data else None)
    return orders_out(db, [order], user)[0]
