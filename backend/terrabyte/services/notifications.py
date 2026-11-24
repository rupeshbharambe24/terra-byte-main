from __future__ import annotations

from sqlalchemy.orm import Session

from terrabyte.models import Notification


def notify(
    db: Session,
    user_id: int,
    type_: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
) -> Notification:
    """Queue a notification in the current transaction (caller commits)."""
    note = Notification(user_id=user_id, type=type_, title=title, body=body, link=link)
    db.add(note)
    return note
