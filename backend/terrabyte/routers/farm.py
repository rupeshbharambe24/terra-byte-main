"""A farmer's fields and farm accounts (ledger)."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response
from sqlalchemy import select

from terrabyte.errors import ApiError
from terrabyte.models import Field, LedgerEntry, LedgerType, User, UserRole
from terrabyte.pagination import Paging, page_rows
from terrabyte.schemas.common import Page
from terrabyte.schemas.farm import (
    FieldIn,
    FieldOut,
    FieldUpdate,
    LedgerIn,
    LedgerOut,
    LedgerSummary,
    LedgerUpdate,
    check_category,
)
from terrabyte.security import DbSession, require_role
from terrabyte.services.common import apply_patch, money
from terrabyte.services.ledger import export_csv, ledger_query, summarize

router = APIRouter(tags=["farm"])

FarmerUser = Annotated[User, Depends(require_role(UserRole.farmer))]


def _own_field(db: DbSession, farmer: User, field_id: int) -> Field:
    field = db.get(Field, field_id)
    if field is None or field.owner_id != farmer.id:
        raise ApiError(404, "not_found", "Field not found.")
    return field


# ---- Fields ------------------------------------------------------------------------------------


@router.get("/fields", response_model=list[FieldOut])
def list_fields(farmer: FarmerUser, db: DbSession) -> list[FieldOut]:
    rows = db.scalars(select(Field).where(Field.owner_id == farmer.id).order_by(Field.id))
    return [FieldOut.model_validate(f) for f in rows]


@router.post("/fields", response_model=FieldOut, status_code=status.HTTP_201_CREATED)
def create_field(data: FieldIn, farmer: FarmerUser, db: DbSession) -> FieldOut:
    count = len(db.scalars(select(Field.id).where(Field.owner_id == farmer.id)).all())
    if count >= 50:
        raise ApiError(409, "too_many_fields", "At most 50 fields per farmer.")
    field = Field(owner_id=farmer.id, **data.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)
    return FieldOut.model_validate(field)


@router.patch("/fields/{field_id}", response_model=FieldOut)
def update_field(field_id: int, data: FieldUpdate, farmer: FarmerUser, db: DbSession) -> FieldOut:
    field = _own_field(db, farmer, field_id)
    apply_patch(field, data.model_dump(exclude_unset=True), {"name", "area_acres"})
    db.commit()
    db.refresh(field)
    return FieldOut.model_validate(field)


@router.delete("/fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_field(field_id: int, farmer: FarmerUser, db: DbSession) -> None:
    db.delete(_own_field(db, farmer, field_id))  # ledger entries keep their amount (field -> null)
    db.commit()


# ---- Ledger ------------------------------------------------------------------------------------


def _ledger_out(entry: LedgerEntry, field_name: str | None) -> LedgerOut:
    out = LedgerOut.model_validate(entry)
    out.field_name = field_name
    return out


@router.get("/ledger", response_model=Page[LedgerOut])
def list_ledger(
    farmer: FarmerUser,
    db: DbSession,
    paging: Paging,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
    type: LedgerType | None = None,  # noqa: A002
    category: Annotated[str | None, Query(max_length=60)] = None,
    field_id: int | None = None,
) -> Page[LedgerOut]:
    stmt = ledger_query(
        farmer.id,
        date_from=date_from,
        date_to=date_to,
        type_=type,
        category=category,
        field_id=field_id,
    )
    rows, total = page_rows(db, stmt, paging)
    return Page(
        items=[_ledger_out(e, name) for e, name in rows],
        total=total,
        limit=paging.limit,
        offset=paging.offset,
    )


@router.get("/ledger/summary", response_model=LedgerSummary)
def ledger_summary(
    farmer: FarmerUser,
    db: DbSession,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
) -> LedgerSummary:
    """Totals per month, category and field, computed from the entries."""
    return summarize(db, farmer.id, date_from, date_to)


@router.get("/ledger/export.csv", response_class=Response)
def ledger_export(
    farmer: FarmerUser,
    db: DbSession,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
) -> Response:
    body = export_csv(db, farmer.id, date_from, date_to)
    return Response(
        content="﻿" + body,  # BOM so Excel opens the UTF-8 (Devanagari) notes correctly
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="terrabyte-farm-accounts.csv"'},
    )


@router.post("/ledger", response_model=LedgerOut, status_code=status.HTTP_201_CREATED)
def create_ledger_entry(data: LedgerIn, farmer: FarmerUser, db: DbSession) -> LedgerOut:
    field_name = _own_field(db, farmer, data.field_id).name if data.field_id else None
    entry = LedgerEntry(user_id=farmer.id, **data.model_dump())
    entry.amount_inr = money(data.amount_inr)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _ledger_out(entry, field_name)


def _own_entry(db: DbSession, farmer: User, entry_id: int) -> LedgerEntry:
    entry = db.get(LedgerEntry, entry_id)
    if entry is None or entry.user_id != farmer.id:
        raise ApiError(404, "not_found", "Entry not found.")
    return entry


@router.patch("/ledger/{entry_id}", response_model=LedgerOut)
def update_ledger_entry(
    entry_id: int, data: LedgerUpdate, farmer: FarmerUser, db: DbSession
) -> LedgerOut:
    entry = _own_entry(db, farmer, entry_id)
    changes = data.model_dump(exclude_unset=True)
    linked = entry.order_id is not None or entry.booking_id is not None
    if linked and {"amount_inr", "type", "entry_date"} & changes.keys():
        raise ApiError(
            409,
            "linked_entry",
            "Amount, type and date come from the order or booking and cannot be changed.",
        )
    if changes.get("field_id") is not None:
        _own_field(db, farmer, changes["field_id"])
    if changes.get("amount_inr") is not None:
        changes["amount_inr"] = money(changes["amount_inr"])
    apply_patch(entry, changes, {"entry_date", "type", "category", "amount_inr"})
    try:
        check_category(entry.type, entry.category)
    except ValueError as exc:
        db.rollback()
        raise ApiError(422, "validation_error", str(exc)) from exc
    db.commit()
    db.refresh(entry)
    field_name = db.get(Field, entry.field_id).name if entry.field_id else None
    return _ledger_out(entry, field_name)


@router.delete("/ledger/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ledger_entry(entry_id: int, farmer: FarmerUser, db: DbSession) -> None:
    db.delete(_own_entry(db, farmer, entry_id))
    db.commit()
