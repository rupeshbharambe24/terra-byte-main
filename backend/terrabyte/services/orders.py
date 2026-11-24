"""Marketplace orders: placing (server-side prices, atomic stock) and the status machine."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from terrabyte.db import utcnow
from terrabyte.errors import ApiError
from terrabyte.models import (
    Order,
    OrderItem,
    OrderStatus,
    Product,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.schemas.market import OrderIn
from terrabyte.services.common import money
from terrabyte.services.ledger import record_order_expense
from terrabyte.services.notifications import notify

S = OrderStatus


@dataclass(frozen=True)
class Transition:
    sources: frozenset[OrderStatus]
    target: OrderStatus
    actor: str  # "vendor" or "buyer"
    stamp: str  # timestamp column set on success
    restores_stock: bool = False


TRANSITIONS: dict[str, Transition] = {
    "accept": Transition(frozenset({S.placed}), S.accepted, "vendor", "accepted_at"),
    "reject": Transition(frozenset({S.placed}), S.rejected, "vendor", "rejected_at", True),
    "ship": Transition(frozenset({S.accepted}), S.shipped, "vendor", "shipped_at"),
    "deliver": Transition(frozenset({S.shipped}), S.delivered, "vendor", "delivered_at"),
    "cancel": Transition(frozenset({S.placed}), S.cancelled, "buyer", "cancelled_at", True),
}

OPEN_STATUSES = (S.placed, S.accepted, S.shipped)


def place_orders(db: Session, buyer: User, data: OrderIn) -> list[Order]:
    """Create one order per vendor. Prices come from the product rows; stock is decremented with
    a conditional UPDATE so two buyers can never take the same last unit."""
    quantities: OrderedDict[int, int] = OrderedDict()
    for line in data.items:
        quantities[line.product_id] = quantities.get(line.product_id, 0) + line.quantity
    if any(q > 1000 for q in quantities.values()):
        raise ApiError(422, "validation_error", "At most 1000 units of one product per order.")

    rows = db.execute(
        select(Product, User)
        .join(User, User.id == Product.vendor_id)
        .where(Product.id.in_(quantities))
    ).all()
    found = {p.id: (p, v) for p, v in rows}
    for pid in quantities:
        product, vendor = found.get(pid, (None, None))
        if (
            product is None
            or vendor is None
            or not product.active
            or vendor.status != UserStatus.approved
            or vendor.role != UserRole.vendor
        ):
            raise ApiError(409, "product_unavailable", f"Product {pid} is not available.")

    by_vendor: OrderedDict[int, list[tuple[Product, int]]] = OrderedDict()
    for pid, qty in quantities.items():
        product, _vendor = found[pid]
        result = db.execute(
            update(Product)
            .where(Product.id == pid, Product.active.is_(True), Product.stock >= qty)
            .values(stock=Product.stock - qty)
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            db.rollback()
            raise ApiError(
                409, "out_of_stock", f"Not enough stock of {product.name} for {qty} {product.unit}."
            )
        by_vendor.setdefault(product.vendor_id, []).append((product, qty))

    orders: list[Order] = []
    for vendor_id, lines in by_vendor.items():
        order = Order(
            buyer_id=buyer.id,
            vendor_id=vendor_id,
            status=S.placed,
            delivery_address=data.delivery_address.strip(),
            payment_method=data.payment_method,
            note=data.note,
            total_inr=money(0),
        )
        total = money(0)
        for product, qty in lines:
            unit_price = money(product.price_inr)
            line_total = money(unit_price * qty)
            total += line_total
            order.items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    unit=product.unit,
                    quantity=qty,
                    unit_price_inr=unit_price,
                    line_total_inr=line_total,
                )
            )
        order.total_inr = money(total)
        db.add(order)
        db.flush()
        notify(
            db,
            vendor_id,
            "order_placed",
            f"New order #{order.id}",
            f"{buyer.name} ordered {len(lines)} item(s), total Rs {order.total_inr}.",
            "/vendor-orders",
        )
        orders.append(order)
    db.commit()
    for order in orders:
        db.refresh(order)
    return orders


def get_order_for(db: Session, user: User, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None or (
        user.role != UserRole.admin and user.id not in (order.buyer_id, order.vendor_id)
    ):
        raise ApiError(404, "not_found", "Order not found.")
    return order


_NOTICES = {
    "accept": ("order_accepted", "Order #{id} accepted", "The vendor accepted your order."),
    "reject": ("order_rejected", "Order #{id} rejected", "The vendor could not take your order."),
    "ship": ("order_shipped", "Order #{id} shipped", "Your order is on its way."),
    "deliver": ("order_delivered", "Order #{id} delivered", "Added to your farm accounts."),
    "cancel": ("order_cancelled", "Order #{id} cancelled", "The buyer cancelled the order."),
}


def change_order_status(
    db: Session, user: User, order_id: int, action: str, reason: str | None
) -> Order:
    if action not in TRANSITIONS:
        raise ApiError(404, "not_found", "Unknown action.")
    rule = TRANSITIONS[action]
    order = get_order_for(db, user, order_id)
    actor_id = order.vendor_id if rule.actor == "vendor" else order.buyer_id
    if user.id != actor_id:
        raise ApiError(403, "forbidden", "You cannot do this on this order.")

    now = utcnow()
    values: dict[str, object] = {"status": rule.target, "updated_at": now, rule.stamp: now}
    if action in ("reject", "cancel"):
        values["status_reason"] = reason
    # Conditional update: the state check and the change are one atomic statement, so a cancel
    # racing an accept can only succeed once (and stock is restored at most once).
    result = db.execute(
        update(Order)
        .where(Order.id == order.id, Order.status.in_(rule.sources))
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        db.rollback()
        db.refresh(order)
        raise ApiError(
            409,
            "invalid_transition",
            f"Cannot {action} an order whose status is {order.status.value}.",
        )
    if rule.restores_stock:
        for item in order.items:
            if item.product_id is not None:
                db.execute(
                    update(Product)
                    .where(Product.id == item.product_id)
                    .values(stock=Product.stock + item.quantity)
                    .execution_options(synchronize_session=False)
                )
    db.flush()
    db.refresh(order)
    if rule.target == S.delivered:
        record_order_expense(db, order)

    type_, title, body = _NOTICES[action]
    if reason and action in ("reject", "cancel"):
        body = f"{body} Reason: {reason}"
    if rule.actor == "vendor":
        notify(db, order.buyer_id, type_, title.format(id=order.id), body, f"/orders/{order.id}")
    else:
        notify(db, order.vendor_id, type_, title.format(id=order.id), body, "/vendor-orders")
    db.commit()
    db.refresh(order)
    return order
