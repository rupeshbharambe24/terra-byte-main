from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from terrabyte.db import Base, TimestampMixin, utcnow
from terrabyte.models.enums import ModerationStatus, ReportStatus, db_enum


class ForumPost(TimestampMixin, Base):
    __tablename__ = "forum_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(60), index=True)
    crop: Mapped[str | None] = mapped_column(String(80))
    image_path: Mapped[str | None] = mapped_column(String(255))
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        db_enum(ModerationStatus), default=ModerationStatus.published, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class ForumReply(TimestampMixin, Base):
    __tablename__ = "forum_replies"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("forum_posts.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        db_enum(ModerationStatus), default=ModerationStatus.published, index=True
    )


class ForumReport(TimestampMixin, Base):
    """A user's report about a post or reply; exactly one target is set."""

    __tablename__ = "forum_reports"
    __table_args__ = (
        CheckConstraint(
            "(post_id IS NOT NULL) <> (reply_id IS NOT NULL)", name="ck_forum_report_one_target"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    post_id: Mapped[int | None] = mapped_column(
        ForeignKey("forum_posts.id", ondelete="CASCADE"), index=True
    )
    reply_id: Mapped[int | None] = mapped_column(
        ForeignKey("forum_replies.id", ondelete="CASCADE"), index=True
    )
    reason: Mapped[str] = mapped_column(String(500))
    status: Mapped[ReportStatus] = mapped_column(
        db_enum(ReportStatus), default=ReportStatus.open, index=True
    )
    resolved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(255))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
