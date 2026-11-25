from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select, update

from terrabyte.db import utcnow
from terrabyte.errors import ApiError
from terrabyte.models import Notification
from terrabyte.schemas.misc import NotificationOut, NotificationPage, UnreadCount
from terrabyte.security import CurrentUser, DbSession

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _unread(db: DbSession, user_id: int) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        or 0
    )


@router.get("", response_model=NotificationPage)
def list_notifications(
    user: CurrentUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    unread_only: bool = False,
) -> NotificationPage:
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return NotificationPage(
        items=[NotificationOut.model_validate(n) for n in rows],
        unread=_unread(db, user.id),
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(user: CurrentUser, db: DbSession) -> UnreadCount:
    """Cheap endpoint for the header badge."""
    return UnreadCount(unread=_unread(db, user.id))


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(notification_id: int, user: CurrentUser, db: DbSession) -> None:
    note = db.get(Notification, notification_id)
    if note is None or note.user_id != user.id:
        raise ApiError(404, "not_found", "Notification not found.")
    if note.read_at is None:
        note.read_at = utcnow()
        db.commit()


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(user: CurrentUser, db: DbSession) -> None:
    db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=utcnow())
    )
    db.commit()
