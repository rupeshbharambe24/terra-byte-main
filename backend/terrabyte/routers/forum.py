"""Community forum with reports and admin moderation. Hidden content is visible to admins only."""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy import func, or_, select, true, update
from sqlalchemy.orm import Session

from terrabyte.db import utcnow
from terrabyte.errors import ApiError
from terrabyte.models import (
    ForumPost,
    ForumReply,
    ForumReport,
    ModerationStatus,
    ReportStatus,
    User,
    UserRole,
    UserStatus,
)
from terrabyte.pagination import Paging, page_rows
from terrabyte.schemas.common import Page
from terrabyte.schemas.forum import (
    Author,
    ModerationAction,
    PostDetail,
    PostIn,
    PostOut,
    ReplyIn,
    ReplyOut,
    ReportIn,
    ReportOut,
)
from terrabyte.security import AdminUser, CurrentUser, DbSession, SettingsDep, require_role
from terrabyte.services.notifications import notify
from terrabyte.services.uploads import check_owned_image

router = APIRouter(tags=["forum"])

Member = Annotated[User, Depends(require_role(UserRole.farmer, UserRole.expert, UserRole.admin))]
M = ModerationStatus


def _authors(db: Session, ids: set[int]) -> dict[int, Author]:
    if not ids:
        return {}
    return {
        u.id: Author(id=u.id, name=u.name, role=u.role)
        for u in db.scalars(select(User).where(User.id.in_(ids)))
    }


def _visible_reply_filter(user: User):
    if user.role == UserRole.admin:
        return true()
    return ForumReply.moderation_status == M.published


def _posts_out(db: Session, posts: list[ForumPost], user: User) -> list[PostOut]:
    ids = [p.id for p in posts]
    counts = (
        dict(
            db.execute(
                select(ForumReply.post_id, func.count())
                .where(ForumReply.post_id.in_(ids), _visible_reply_filter(user))
                .group_by(ForumReply.post_id)
            ).all()
        )
        if ids
        else {}
    )
    authors = _authors(db, {p.author_id for p in posts})
    return [
        PostOut(
            id=p.id,
            author=authors[p.author_id],
            title=p.title,
            body=p.body,
            category=p.category,
            crop=p.crop,
            image_path=p.image_path,
            moderation_status=p.moderation_status,
            reply_count=counts.get(p.id, 0),
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in posts
    ]


def _get_post(db: Session, user: User, post_id: int) -> ForumPost:
    post = db.get(ForumPost, post_id)
    if post is None or (user.role != UserRole.admin and post.moderation_status != M.published):
        raise ApiError(404, "not_found", "Post not found.")
    return post


def _get_reply(db: Session, user: User, reply_id: int) -> ForumReply:
    reply = db.get(ForumReply, reply_id)
    if reply is None:
        raise ApiError(404, "not_found", "Reply not found.")
    _get_post(db, user, reply.post_id)
    if user.role != UserRole.admin and reply.moderation_status != M.published:
        raise ApiError(404, "not_found", "Reply not found.")
    return reply


def _detail(db: Session, post: ForumPost, user: User) -> PostDetail:
    replies = list(
        db.scalars(
            select(ForumReply)
            .where(ForumReply.post_id == post.id, _visible_reply_filter(user))
            .order_by(ForumReply.created_at, ForumReply.id)
        )
    )
    authors = _authors(db, {r.author_id for r in replies})
    base = _posts_out(db, [post], user)[0]
    return PostDetail(
        **base.model_dump(),
        replies=[
            ReplyOut(
                id=r.id,
                post_id=r.post_id,
                author=authors[r.author_id],
                body=r.body,
                moderation_status=r.moderation_status,
                created_at=r.created_at,
            )
            for r in replies
        ],
    )


# ---- Posts and replies ---------------------------------------------------------------------------


@router.get("/forum/posts", response_model=Page[PostOut])
def list_posts(
    user: CurrentUser,
    db: DbSession,
    paging: Paging,
    category: Annotated[str | None, Query(max_length=60)] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    mine: bool = False,
) -> Page[PostOut]:
    stmt = select(ForumPost)
    if user.role != UserRole.admin:
        stmt = stmt.where(ForumPost.moderation_status == M.published)
    if category:
        stmt = stmt.where(ForumPost.category == category)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(func.lower(ForumPost.title).like(like), func.lower(ForumPost.body).like(like))
        )
    if mine:
        stmt = stmt.where(ForumPost.author_id == user.id)
    rows, total = page_rows(
        db, stmt.order_by(ForumPost.created_at.desc(), ForumPost.id.desc()), paging
    )
    return Page(
        items=_posts_out(db, rows, user), total=total, limit=paging.limit, offset=paging.offset
    )


@router.post("/forum/posts", response_model=PostDetail, status_code=status.HTTP_201_CREATED)
def create_post(data: PostIn, user: Member, db: DbSession, settings: SettingsDep) -> PostDetail:
    check_owned_image(data.image_path, user.id, settings.upload_dir)
    post = ForumPost(author_id=user.id, **data.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return _detail(db, post, user)


@router.get("/forum/posts/{post_id}", response_model=PostDetail)
def get_post(post_id: int, user: CurrentUser, db: DbSession) -> PostDetail:
    return _detail(db, _get_post(db, user, post_id), user)


@router.post(
    "/forum/posts/{post_id}/replies", response_model=PostDetail, status_code=status.HTTP_201_CREATED
)
def create_reply(post_id: int, data: ReplyIn, user: Member, db: DbSession) -> PostDetail:
    post = _get_post(db, user, post_id)
    if post.moderation_status != M.published:
        raise ApiError(409, "post_hidden", "Replies are closed on hidden posts.")
    db.add(ForumReply(post_id=post.id, author_id=user.id, body=data.body))
    if post.author_id != user.id:
        notify(
            db,
            post.author_id,
            "forum_reply",
            f"New reply to “{post.title[:80]}”",
            f"{user.name}: {data.body[:150]}",
            f"/forums/{post.id}",
        )
    db.commit()
    return _detail(db, post, user)


@router.delete("/forum/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, user: Member, db: DbSession) -> None:
    """Authors remove their own post (kept for the moderation record, hidden from everyone)."""
    post = _get_post(db, user, post_id)
    if post.author_id != user.id:
        raise ApiError(403, "forbidden", "You can only delete your own posts.")
    post.moderation_status = M.removed
    db.commit()


@router.delete("/forum/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reply(reply_id: int, user: Member, db: DbSession) -> None:
    reply = _get_reply(db, user, reply_id)
    if reply.author_id != user.id:
        raise ApiError(403, "forbidden", "You can only delete your own replies.")
    reply.moderation_status = M.removed
    db.commit()


# ---- Reports -------------------------------------------------------------------------------------


def _report(
    db: Session, user: User, *, post: ForumPost | None, reply: ForumReply | None, reason: str
):
    target_author = (post or reply).author_id  # type: ignore[union-attr]
    if target_author == user.id:
        raise ApiError(400, "cannot_report_own", "You cannot report your own content.")
    same_target = (
        ForumReport.post_id == post.id if post is not None else ForumReport.reply_id == reply.id  # type: ignore[union-attr]
    )
    existing = db.scalar(
        select(ForumReport.id).where(
            ForumReport.reporter_id == user.id,
            ForumReport.status == ReportStatus.open,
            same_target,
        )
    )
    if existing is not None:
        raise ApiError(409, "already_reported", "You have already reported this.")
    db.add(
        ForumReport(
            reporter_id=user.id,
            post_id=post.id if post else None,
            reply_id=reply.id if reply else None,
            reason=reason.strip(),
        )
    )
    for admin_id in db.scalars(
        select(User.id).where(User.role == UserRole.admin, User.status == UserStatus.approved)
    ):
        notify(
            db,
            admin_id,
            "forum_report",
            "New forum report",
            reason.strip()[:200],
            "/admin-content",
        )
    db.commit()


@router.post("/forum/posts/{post_id}/report", status_code=status.HTTP_204_NO_CONTENT)
def report_post(post_id: int, data: ReportIn, user: Member, db: DbSession) -> None:
    _report(db, user, post=_get_post(db, user, post_id), reply=None, reason=data.reason)


@router.post("/forum/replies/{reply_id}/report", status_code=status.HTTP_204_NO_CONTENT)
def report_reply(reply_id: int, data: ReportIn, user: Member, db: DbSession) -> None:
    _report(db, user, post=None, reply=_get_reply(db, user, reply_id), reason=data.reason)


# ---- Moderation (admin) --------------------------------------------------------------------------


@router.get("/admin/forum/reports", response_model=Page[ReportOut])
def list_reports(
    _admin: AdminUser,
    db: DbSession,
    paging: Paging,
    status_: Annotated[ReportStatus | None, Query(alias="status")] = ReportStatus.open,
) -> Page[ReportOut]:
    stmt = select(ForumReport)
    if status_ is not None:
        stmt = stmt.where(ForumReport.status == status_)
    rows, total = page_rows(
        db, stmt.order_by(ForumReport.created_at.desc(), ForumReport.id.desc()), paging
    )
    posts = {
        p.id: p
        for p in db.scalars(
            select(ForumPost).where(ForumPost.id.in_({r.post_id for r in rows if r.post_id}))
        )
    }
    replies = {
        r.id: r
        for r in db.scalars(
            select(ForumReply).where(ForumReply.id.in_({r.reply_id for r in rows if r.reply_id}))
        )
    }
    author_ids = (
        {r.reporter_id for r in rows}
        | {p.author_id for p in posts.values()}
        | {r.author_id for r in replies.values()}
    )
    authors = _authors(db, author_ids)
    items = []
    for r in rows:
        if r.post_id:
            target = posts[r.post_id]
            items.append(
                ReportOut(
                    id=r.id,
                    reporter=authors[r.reporter_id],
                    reason=r.reason,
                    status=r.status,
                    created_at=r.created_at,
                    resolved_at=r.resolved_at,
                    target_type="post",
                    target_id=target.id,
                    post_id=target.id,
                    target_title=target.title,
                    target_body=target.body,
                    target_author=authors[target.author_id],
                    target_status=target.moderation_status,
                )
            )
        else:
            reply = replies[r.reply_id]  # type: ignore[index]
            items.append(
                ReportOut(
                    id=r.id,
                    reporter=authors[r.reporter_id],
                    reason=r.reason,
                    status=r.status,
                    created_at=r.created_at,
                    resolved_at=r.resolved_at,
                    target_type="reply",
                    target_id=reply.id,
                    post_id=reply.post_id,
                    target_title=None,
                    target_body=reply.body,
                    target_author=authors[reply.author_id],
                    target_status=reply.moderation_status,
                )
            )
    return Page(items=items, total=total, limit=paging.limit, offset=paging.offset)


@router.post("/admin/forum/reports/{report_id}/dismiss", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_report(report_id: int, admin: AdminUser, db: DbSession) -> None:
    report = db.get(ForumReport, report_id)
    if report is None:
        raise ApiError(404, "not_found", "Report not found.")
    if report.status != ReportStatus.open:
        raise ApiError(409, "invalid_transition", "This report is already closed.")
    report.status = ReportStatus.dismissed
    report.resolved_by_id = admin.id
    report.resolved_at = utcnow()
    db.commit()


def _moderate(
    db: Session,
    admin: User,
    kind: Literal["post", "reply"],
    target_id: int,
    hide: bool,
    reason: str | None,
) -> None:
    model = ForumPost if kind == "post" else ForumReply
    target = db.get(model, target_id)
    if target is None:
        raise ApiError(404, "not_found", "Content not found.")
    source, goal = (M.published, M.hidden) if hide else (M.hidden, M.published)
    if target.moderation_status != source:
        raise ApiError(
            409,
            "invalid_transition",
            f"Cannot {'hide' if hide else 'restore'} content that is "
            f"{target.moderation_status.value}.",
        )
    target.moderation_status = goal
    now = utcnow()
    if hide:
        column = ForumReport.post_id if kind == "post" else ForumReport.reply_id
        db.execute(
            update(ForumReport)
            .where(column == target.id, ForumReport.status == ReportStatus.open)
            .values(status=ReportStatus.resolved, resolved_by_id=admin.id, resolved_at=now)
            .execution_options(synchronize_session=False)
        )
    post_id = target.id if kind == "post" else target.post_id  # type: ignore[attr-defined]
    notify(
        db,
        target.author_id,
        "forum_hidden" if hide else "forum_restored",
        f"Your {kind} was {'hidden by a moderator' if hide else 'restored'}",
        f"Reason: {reason}" if reason else None,
        f"/forums/{post_id}" if not hide else None,
    )
    db.commit()


def _moderation_route(kind: Literal["post", "reply"], hide: bool):
    def endpoint(
        target_id: int,
        admin: AdminUser,
        db: DbSession,
        data: Annotated[ModerationAction | None, Body()] = None,
    ) -> None:
        _moderate(db, admin, kind, target_id, hide, data.reason if data else None)

    endpoint.__name__ = f"{'hide' if hide else 'restore'}_{kind}"
    return endpoint


for _kind, _plural in (("post", "posts"), ("reply", "replies")):
    for _hide in (True, False):
        router.add_api_route(
            f"/admin/forum/{_plural}/{{target_id}}/{'hide' if _hide else 'restore'}",
            _moderation_route(_kind, _hide),  # type: ignore[arg-type]
            methods=["POST"],
            status_code=status.HTTP_204_NO_CONTENT,
        )
