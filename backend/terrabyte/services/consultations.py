"""Farmer questions to experts (optionally addressed to a KVK) and their threaded replies."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import Select, and_, func, or_, select, update
from sqlalchemy.orm import Session

from terrabyte.db import utcnow
from terrabyte.errors import ApiError
from terrabyte.models import (
    KVK,
    Consultation,
    ConsultationMessage,
    ConsultationStatus,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.schemas.advisory import (
    ConsultationDetail,
    ConsultationIn,
    ConsultationOut,
    MessageIn,
    MessageOut,
)
from terrabyte.services.notifications import notify
from terrabyte.services.uploads import check_owned_image

C = ConsultationStatus
EXPERT_NOTIFY_LIMIT = 50


def visible_to(user: User) -> Select:
    stmt = select(Consultation)
    if user.role == UserRole.farmer:
        return stmt.where(Consultation.farmer_id == user.id)
    if user.role == UserRole.expert:
        return stmt.where(
            or_(
                Consultation.expert_id == user.id,
                and_(Consultation.expert_id.is_(None), Consultation.status == C.open),
            )
        )
    if user.role == UserRole.admin:
        return stmt
    return stmt.where(False)


def get_for(db: Session, user: User, consultation_id: int) -> Consultation:
    c = db.scalar(visible_to(user).where(Consultation.id == consultation_id))
    if c is None:
        raise ApiError(404, "not_found", "Consultation not found.")
    return c


def to_out(db: Session, rows: list[Consultation]) -> list[ConsultationOut]:
    user_ids = {c.farmer_id for c in rows} | {c.expert_id for c in rows if c.expert_id}
    users = (
        {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids)))} if user_ids else {}
    )
    kvk_ids = {c.kvk_id for c in rows if c.kvk_id}
    kvks = (
        {k.id: k.name for k in db.scalars(select(KVK).where(KVK.id.in_(kvk_ids)))}
        if kvk_ids
        else {}
    )
    ids = [c.id for c in rows]
    counts = (
        dict(
            db.execute(
                select(ConsultationMessage.consultation_id, func.count())
                .where(ConsultationMessage.consultation_id.in_(ids))
                .group_by(ConsultationMessage.consultation_id)
            ).all()
        )
        if ids
        else {}
    )
    out = []
    for c in rows:
        farmer = users.get(c.farmer_id)
        expert = users.get(c.expert_id) if c.expert_id else None
        out.append(
            ConsultationOut.model_validate(
                {
                    **{col.key: getattr(c, col.key) for col in Consultation.__table__.columns},
                    "farmer_name": farmer.name if farmer else "",
                    "farmer_district": farmer.district if farmer else None,
                    "expert_name": expert.name if expert else None,
                    "kvk_name": kvks.get(c.kvk_id) if c.kvk_id else None,
                    "message_count": counts.get(c.id, 0),
                }
            )
        )
    return out


def to_detail(db: Session, c: Consultation) -> ConsultationDetail:
    base = to_out(db, [c])[0]
    authors = {m.author_id for m in c.messages}
    users = (
        {u.id: u for u in db.scalars(select(User).where(User.id.in_(authors)))} if authors else {}
    )
    messages = [
        MessageOut(
            id=m.id,
            author_id=m.author_id,
            author_name=users[m.author_id].name if m.author_id in users else "",
            author_role=users[m.author_id].role if m.author_id in users else UserRole.farmer,
            body=m.body,
            image_path=m.image_path,
            created_at=m.created_at,
        )
        for m in c.messages
    ]
    return ConsultationDetail(**base.model_dump(), messages=messages)


def create(db: Session, farmer: User, data: ConsultationIn, upload_dir: Path) -> Consultation:
    check_owned_image(data.image_path, farmer.id, upload_dir)
    if data.kvk_id is not None and db.get(KVK, data.kvk_id) is None:
        raise ApiError(422, "validation_error", "Unknown KVK.")
    c = Consultation(
        farmer_id=farmer.id,
        kvk_id=data.kvk_id,
        crop=data.crop,
        category=data.category,
        question=data.question.strip(),
        image_path=data.image_path,
        status=C.open,
    )
    db.add(c)
    db.flush()
    experts = db.scalars(
        select(User.id)
        .where(User.role == UserRole.expert, User.status == UserStatus.approved)
        .limit(EXPERT_NOTIFY_LIMIT)
    )
    for expert_id in experts:
        notify(
            db,
            expert_id,
            "consultation_new",
            f"New question #{c.id}" + (f" about {c.crop}" if c.crop else ""),
            c.question[:200],
            f"/consultations/{c.id}",
        )
    db.commit()
    db.refresh(c)
    return c


def claim(db: Session, expert: User, consultation_id: int) -> Consultation:
    c = get_for(db, expert, consultation_id)
    now = utcnow()
    result = db.execute(
        update(Consultation)
        .where(
            Consultation.id == c.id,
            Consultation.expert_id.is_(None),
            Consultation.status == C.open,
        )
        .values(expert_id=expert.id, status=C.assigned, assigned_at=now, updated_at=now)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        db.rollback()
        raise ApiError(409, "already_claimed", "Another expert has already taken this question.")
    notify(
        db,
        c.farmer_id,
        "consultation_assigned",
        f"An expert is looking at your question #{c.id}",
        f"{expert.name} will answer.",
        f"/consultations/{c.id}",
    )
    db.commit()
    db.refresh(c)
    return c


def add_message(
    db: Session, user: User, consultation_id: int, data: MessageIn, upload_dir: Path
) -> Consultation:
    c = get_for(db, user, consultation_id)
    if c.status == C.closed:
        raise ApiError(409, "consultation_closed", "This consultation is closed.")
    check_owned_image(data.image_path, user.id, upload_dir)
    now = utcnow()
    if user.id == c.farmer_id:
        if c.status == C.answered:
            c.status = C.assigned  # waiting for the expert again
        recipient, link = c.expert_id, f"/consultations/{c.id}"
        title = f"Follow-up on question #{c.id}"
    elif user.role == UserRole.expert and c.expert_id == user.id:
        c.status = C.answered
        if c.first_response_at is None:
            c.first_response_at = now
        recipient, link = c.farmer_id, f"/consultations/{c.id}"
        title = f"New reply to your question #{c.id}"
    elif user.role == UserRole.expert:
        raise ApiError(409, "not_assigned", "Take the question before replying.")
    else:
        raise ApiError(403, "forbidden", "Only the farmer and the assigned expert can reply.")
    c.messages.append(
        ConsultationMessage(author_id=user.id, body=data.body, image_path=data.image_path)
    )
    c.updated_at = now
    if recipient is not None:
        notify(db, recipient, "consultation_message", title, data.body[:200], link)
    db.commit()
    db.refresh(c)
    return c


def set_status(db: Session, user: User, consultation_id: int, target: str) -> Consultation:
    c = get_for(db, user, consultation_id)
    now = utcnow()
    if target == "closed":
        allowed = (
            user.id == c.farmer_id
            or user.role == UserRole.admin
            or (user.role == UserRole.expert and c.expert_id == user.id)
        )
        if not allowed:
            raise ApiError(403, "forbidden", "You cannot close this consultation.")
        if c.status == C.closed:
            raise ApiError(409, "invalid_transition", "Already closed.")
        c.status = C.closed
        c.closed_at = now
        recipients = {c.farmer_id, c.expert_id} - {user.id, None}
        title = f"Question #{c.id} closed"
    else:  # answered
        if not (user.role == UserRole.expert and c.expert_id == user.id):
            raise ApiError(403, "forbidden", "Only the assigned expert can mark it answered.")
        if c.status != C.assigned:
            raise ApiError(
                409, "invalid_transition", f"Cannot mark a {c.status.value} question answered."
            )
        c.status = C.answered
        if c.first_response_at is None and c.messages:
            c.first_response_at = now
        recipients = {c.farmer_id}
        title = f"Question #{c.id} marked answered"
    c.updated_at = now
    for rid in recipients:
        notify(db, rid, f"consultation_{target}", title, None, f"/consultations/{c.id}")
    db.commit()
    db.refresh(c)
    return c


def assign(db: Session, admin: User, consultation_id: int, expert_id: int) -> Consultation:
    c = get_for(db, admin, consultation_id)
    if c.status == C.closed:
        raise ApiError(409, "consultation_closed", "This consultation is closed.")
    expert = db.get(User, expert_id)
    if expert is None or expert.role != UserRole.expert or expert.status != UserStatus.approved:
        raise ApiError(422, "validation_error", "Choose an approved expert.")
    previous = c.expert_id
    now = utcnow()
    c.expert_id = expert.id
    c.assigned_at = now
    if c.status == C.open:
        c.status = C.assigned
    c.updated_at = now
    notify(
        db,
        expert.id,
        "consultation_assigned_to_you",
        f"Question #{c.id} assigned to you",
        c.question[:200],
        f"/consultations/{c.id}",
    )
    if previous and previous != expert.id:
        notify(
            db,
            previous,
            "consultation_reassigned",
            f"Question #{c.id} reassigned",
            f"An admin gave it to {expert.name}.",
            "/expert-consultations",
        )
    notify(
        db,
        c.farmer_id,
        "consultation_assigned",
        f"An expert is looking at your question #{c.id}",
        f"{expert.name} will answer.",
        f"/consultations/{c.id}",
    )
    db.commit()
    db.refresh(c)
    return c
