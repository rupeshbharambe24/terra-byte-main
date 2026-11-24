"""Read-only listings of active products and equipment (ordering/booking come in Phase 2)."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from terrabyte.models import Equipment, Product, ProductCategory, User, UserStatus
from terrabyte.schemas.misc import EquipmentOut, ProductOut
from terrabyte.security import CurrentUser, DbSession

router = APIRouter(tags=["catalog"])


@router.get("/products", response_model=list[ProductOut])
def list_products(
    _user: CurrentUser,
    db: DbSession,
    category: ProductCategory | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[ProductOut]:
    stmt = (
        select(Product, User.name)
        .join(User, User.id == Product.vendor_id)
        .where(Product.active.is_(True), User.status == UserStatus.approved)
    )
    if category is not None:
        stmt = stmt.where(Product.category == category)
    rows = db.execute(stmt.order_by(Product.name).limit(limit)).all()
    return [
        ProductOut.model_validate({**_cols(p), "vendor_name": vendor_name})
        for p, vendor_name in rows
    ]


@router.get("/equipment", response_model=list[EquipmentOut])
def list_equipment(
    _user: CurrentUser,
    db: DbSession,
    district: Annotated[str | None, Query(max_length=80)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[EquipmentOut]:
    stmt = (
        select(Equipment, User.name)
        .join(User, User.id == Equipment.owner_id)
        .where(Equipment.active.is_(True), User.status == UserStatus.approved)
    )
    if district:
        stmt = stmt.where(Equipment.district == district)
    rows = db.execute(stmt.order_by(Equipment.name).limit(limit)).all()
    return [
        EquipmentOut.model_validate({**_cols(e), "owner_name": owner_name})
        for e, owner_name in rows
    ]


def _cols(obj: object) -> dict[str, object]:
    return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}  # type: ignore[attr-defined]
