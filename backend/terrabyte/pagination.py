"""Limit/offset pagination shared by every list endpoint."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Query
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class PageParams:
    limit: int
    offset: int


def _page_params(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PageParams:
    return PageParams(limit, offset)


Paging = Annotated[PageParams, Depends(_page_params)]


def count(db: Session, stmt: Select[Any]) -> int:
    return db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0


def page_rows(db: Session, stmt: Select[Any], params: PageParams) -> tuple[list[Any], int]:
    """Return (rows, total) for an ordered statement. Rows are ORM objects or tuples."""
    total = count(db, stmt)
    result = db.execute(stmt.limit(params.limit).offset(params.offset))
    rows = list(result.scalars()) if len(stmt.column_descriptions) == 1 else list(result.all())
    return rows, total
