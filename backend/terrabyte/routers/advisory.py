"""Consultations, the KVK directory and expert knowledge articles."""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, or_, select, update

from terrabyte.db import utcnow
from terrabyte.errors import ApiError
from terrabyte.models import (
    KVK,
    Consultation,
    ConsultationStatus,
    DataImport,
    KnowledgeArticle,
    User,
    UserRole,
)
from terrabyte.pagination import Paging, page_rows
from terrabyte.schemas.advisory import (
    ArticleIn,
    ArticleOut,
    ArticleUpdate,
    AssignIn,
    ConsultationDetail,
    ConsultationIn,
    ConsultationOut,
    DataImportOut,
    KVKIn,
    KVKOut,
    KVKStatus,
    KVKUpdate,
    MessageIn,
    StatusIn,
)
from terrabyte.schemas.common import Page
from terrabyte.security import AdminUser, CurrentUser, DbSession, SettingsDep, require_role
from terrabyte.services import consultations as svc
from terrabyte.services.common import apply_patch

router = APIRouter(tags=["advisory"])

FarmerUser = Annotated[User, Depends(require_role(UserRole.farmer))]
ExpertUser = Annotated[User, Depends(require_role(UserRole.expert))]
ConsultationViewer = Annotated[
    User, Depends(require_role(UserRole.farmer, UserRole.expert, UserRole.admin))
]

# ---- Consultations ------------------------------------------------------------------------------


@router.post("/consultations", response_model=ConsultationDetail, status_code=201)
def ask(
    data: ConsultationIn, farmer: FarmerUser, db: DbSession, settings: SettingsDep
) -> ConsultationDetail:
    return svc.to_detail(db, svc.create(db, farmer, data, settings.upload_dir))


@router.get("/consultations", response_model=Page[ConsultationOut])
def list_consultations(
    user: ConsultationViewer,
    db: DbSession,
    paging: Paging,
    scope: Literal["all", "open", "mine"] = "all",
    status_: Annotated[list[ConsultationStatus] | None, Query(alias="status")] = None,
    kvk_id: int | None = None,
) -> Page[ConsultationOut]:
    """Farmers: their questions. Experts: unassigned open questions (``open``) and their own
    (``mine``). Admins: everything (``open`` = unassigned)."""
    stmt = svc.visible_to(user)
    if scope == "open":
        stmt = stmt.where(Consultation.expert_id.is_(None), Consultation.status == "open")
    elif scope == "mine" and user.role == UserRole.expert:
        stmt = stmt.where(Consultation.expert_id == user.id)
    if status_:
        stmt = stmt.where(Consultation.status.in_(status_))
    if kvk_id is not None:
        stmt = stmt.where(Consultation.kvk_id == kvk_id)
    rows, total = page_rows(
        db, stmt.order_by(Consultation.updated_at.desc(), Consultation.id.desc()), paging
    )
    return Page(items=svc.to_out(db, rows), total=total, limit=paging.limit, offset=paging.offset)


@router.get("/consultations/{consultation_id}", response_model=ConsultationDetail)
def get_consultation(
    consultation_id: int, user: ConsultationViewer, db: DbSession
) -> ConsultationDetail:
    return svc.to_detail(db, svc.get_for(db, user, consultation_id))


@router.post("/consultations/{consultation_id}/claim", response_model=ConsultationDetail)
def claim(consultation_id: int, expert: ExpertUser, db: DbSession) -> ConsultationDetail:
    return svc.to_detail(db, svc.claim(db, expert, consultation_id))


@router.post(
    "/consultations/{consultation_id}/messages",
    response_model=ConsultationDetail,
    status_code=201,
)
def reply(
    consultation_id: int,
    data: MessageIn,
    user: ConsultationViewer,
    db: DbSession,
    settings: SettingsDep,
) -> ConsultationDetail:
    c = svc.add_message(db, user, consultation_id, data, settings.upload_dir)
    return svc.to_detail(db, c)


@router.post("/consultations/{consultation_id}/status", response_model=ConsultationDetail)
def set_status(
    consultation_id: int, data: StatusIn, user: ConsultationViewer, db: DbSession
) -> ConsultationDetail:
    return svc.to_detail(db, svc.set_status(db, user, consultation_id, data.status))


@router.post("/admin/consultations/{consultation_id}/assign", response_model=ConsultationDetail)
def assign(
    consultation_id: int, data: AssignIn, admin: AdminUser, db: DbSession
) -> ConsultationDetail:
    return svc.to_detail(db, svc.assign(db, admin, consultation_id, data.expert_id))


# ---- KVK directory -----------------------------------------------------------------------------


@router.get("/kvks", response_model=Page[KVKOut])
def list_kvks(
    _user: CurrentUser,
    db: DbSession,
    paging: Paging,
    q: Annotated[str | None, Query(max_length=100)] = None,
    district: Annotated[str | None, Query(max_length=80)] = None,
    state: Annotated[str | None, Query(max_length=80)] = None,
) -> Page[KVKOut]:
    stmt = select(KVK)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(KVK.name).like(like),
                func.lower(KVK.district).like(like),
                func.lower(func.coalesce(KVK.host_organisation, "")).like(like),
            )
        )
    if district and district.strip():
        stmt = stmt.where(func.lower(KVK.district) == district.strip().lower())
    if state and state.strip():
        stmt = stmt.where(func.lower(KVK.state) == state.strip().lower())
    rows, total = page_rows(db, stmt.order_by(KVK.state, KVK.district, KVK.name), paging)
    return Page(
        items=[KVKOut.model_validate(k) for k in rows],
        total=total,
        limit=paging.limit,
        offset=paging.offset,
    )


@router.get("/kvks/{kvk_id}", response_model=KVKOut)
def get_kvk(kvk_id: int, _user: CurrentUser, db: DbSession) -> KVKOut:
    kvk = db.get(KVK, kvk_id)
    if kvk is None:
        raise ApiError(404, "not_found", "KVK not found.")
    return KVKOut.model_validate(kvk)


@router.post("/admin/kvks", response_model=KVKOut, status_code=status.HTTP_201_CREATED)
def create_kvk(data: KVKIn, _admin: AdminUser, db: DbSession) -> KVKOut:
    kvk = KVK(**data.to_columns())
    db.add(kvk)
    db.commit()
    db.refresh(kvk)
    return KVKOut.model_validate(kvk)


@router.patch("/admin/kvks/{kvk_id}", response_model=KVKOut)
def update_kvk(kvk_id: int, data: KVKUpdate, _admin: AdminUser, db: DbSession) -> KVKOut:
    kvk = db.get(KVK, kvk_id)
    if kvk is None:
        raise ApiError(404, "not_found", "KVK not found.")
    changes = data.model_dump(exclude_unset=True)
    for key in ("website", "source_url"):
        if changes.get(key) is not None:
            changes[key] = str(changes[key])
    apply_patch(kvk, changes, {"name", "district", "state"})
    db.commit()
    db.refresh(kvk)
    return KVKOut.model_validate(kvk)


@router.delete("/admin/kvks/{kvk_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_kvk(kvk_id: int, _admin: AdminUser, db: DbSession) -> None:
    kvk = db.get(KVK, kvk_id)
    if kvk is None:
        raise ApiError(404, "not_found", "KVK not found.")
    # Questions addressed to this KVK stay; they just lose the KVK reference.
    db.execute(
        update(Consultation)
        .where(Consultation.kvk_id == kvk_id)
        .values(kvk_id=None)
        .execution_options(synchronize_session=False)
    )
    db.delete(kvk)
    db.commit()


@router.get("/admin/kvk-status", response_model=KVKStatus)
def kvk_status(_admin: AdminUser, db: DbSession) -> KVKStatus:
    """What the KVK directory contains and the history of imports."""
    imports = db.scalars(
        select(DataImport)
        .where(DataImport.kind == "kvk")
        .order_by(DataImport.imported_at.desc())
        .limit(20)
    )
    return KVKStatus(
        total=db.scalar(select(func.count()).select_from(KVK)) or 0,
        verified=db.scalar(select(func.count()).where(KVK.verified_on.is_not(None))) or 0,
        districts=list(db.scalars(select(KVK.district).distinct().order_by(KVK.district))),
        states=list(db.scalars(select(KVK.state).distinct().order_by(KVK.state))),
        last_verified_on=db.scalar(select(func.max(KVK.verified_on))),
        imports=[DataImportOut.model_validate(i) for i in imports],
    )


# ---- Knowledge articles ------------------------------------------------------------------------


def _articles_out(db: DbSession, rows: list[KnowledgeArticle]) -> list[ArticleOut]:
    ids = {a.author_id for a in rows}
    names = (
        dict(db.execute(select(User.id, User.name).where(User.id.in_(ids))).all()) if ids else {}
    )
    return [
        ArticleOut.model_validate(
            {
                **{c.key: getattr(a, c.key) for c in KnowledgeArticle.__table__.columns},
                "author_name": names.get(a.author_id, ""),
            }
        )
        for a in rows
    ]


@router.get("/articles", response_model=Page[ArticleOut])
def list_articles(
    _user: CurrentUser,
    db: DbSession,
    paging: Paging,
    q: Annotated[str | None, Query(max_length=100)] = None,
    crop: Annotated[str | None, Query(max_length=80)] = None,
) -> Page[ArticleOut]:
    stmt = select(KnowledgeArticle).where(KnowledgeArticle.published.is_(True))
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(KnowledgeArticle.title).like(like),
                func.lower(KnowledgeArticle.body).like(like),
            )
        )
    if crop and crop.strip():
        stmt = stmt.where(func.lower(KnowledgeArticle.crop) == crop.strip().lower())
    rows, total = page_rows(
        db, stmt.order_by(KnowledgeArticle.published_at.desc(), KnowledgeArticle.id.desc()), paging
    )
    return Page(
        items=_articles_out(db, rows), total=total, limit=paging.limit, offset=paging.offset
    )


@router.get("/articles/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, user: CurrentUser, db: DbSession) -> ArticleOut:
    a = db.get(KnowledgeArticle, article_id)
    if a is None or (not a.published and user.id != a.author_id and user.role != UserRole.admin):
        raise ApiError(404, "not_found", "Article not found.")
    return _articles_out(db, [a])[0]


@router.get("/expert/articles", response_model=Page[ArticleOut])
def my_articles(expert: ExpertUser, db: DbSession, paging: Paging) -> Page[ArticleOut]:
    stmt = select(KnowledgeArticle).where(KnowledgeArticle.author_id == expert.id)
    rows, total = page_rows(
        db, stmt.order_by(KnowledgeArticle.updated_at.desc(), KnowledgeArticle.id.desc()), paging
    )
    return Page(
        items=_articles_out(db, rows), total=total, limit=paging.limit, offset=paging.offset
    )


@router.post("/expert/articles", response_model=ArticleOut, status_code=201)
def create_article(data: ArticleIn, expert: ExpertUser, db: DbSession) -> ArticleOut:
    a = KnowledgeArticle(author_id=expert.id, **data.model_dump())
    if a.published:
        a.published_at = utcnow()
    db.add(a)
    db.commit()
    db.refresh(a)
    return _articles_out(db, [a])[0]


def _own_article(db: DbSession, expert: User, article_id: int) -> KnowledgeArticle:
    a = db.get(KnowledgeArticle, article_id)
    if a is None or a.author_id != expert.id:
        raise ApiError(404, "not_found", "Article not found.")
    return a


@router.patch("/expert/articles/{article_id}", response_model=ArticleOut)
def update_article(
    article_id: int, data: ArticleUpdate, expert: ExpertUser, db: DbSession
) -> ArticleOut:
    a = _own_article(db, expert, article_id)
    changes = data.model_dump(exclude_unset=True)
    was_published = a.published
    apply_patch(a, changes, {"title", "body", "published"})
    if a.published and not was_published:
        a.published_at = utcnow()
    db.commit()
    db.refresh(a)
    return _articles_out(db, [a])[0]


@router.delete("/expert/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(article_id: int, expert: ExpertUser, db: DbSession) -> None:
    db.delete(_own_article(db, expert, article_id))
    db.commit()
