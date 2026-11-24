from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from terrabyte.models import ModerationStatus, ReportStatus, UserRole
from terrabyte.schemas.common import BlankToNone

# Keys are translated in the frontend (forum:categories.*).
ForumCategory = Literal[
    "general",
    "crops",
    "pests_diseases",
    "soil_water",
    "market",
    "equipment",
    "schemes",
    "other",
]


def _strip(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Cannot be empty")
    return v


class PostIn(BaseModel):
    title: Annotated[str, Field(min_length=5, max_length=200)]
    body: Annotated[str, Field(min_length=1, max_length=5000)]
    category: ForumCategory = "general"
    crop: Annotated[str | None, Field(max_length=80), BlankToNone] = None
    image_path: Annotated[str | None, Field(max_length=255), BlankToNone] = None

    @field_validator("title", "body")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        return _strip(v)


class ReplyIn(BaseModel):
    body: Annotated[str, Field(min_length=1, max_length=3000)]

    @field_validator("body")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        return _strip(v)


class ReportIn(BaseModel):
    reason: Annotated[str, Field(min_length=3, max_length=500)]


class Author(BaseModel):
    id: int
    name: str
    role: UserRole


class ReplyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    author: Author
    body: str
    moderation_status: ModerationStatus
    created_at: datetime


class PostOut(BaseModel):
    id: int
    author: Author
    title: str
    body: str
    category: str | None
    crop: str | None
    image_path: str | None
    moderation_status: ModerationStatus
    reply_count: int
    created_at: datetime
    updated_at: datetime


class PostDetail(PostOut):
    replies: list[ReplyOut]


class ReportOut(BaseModel):
    id: int
    reporter: Author
    reason: str
    status: ReportStatus
    created_at: datetime
    resolved_at: datetime | None
    target_type: Literal["post", "reply"]
    target_id: int
    post_id: int
    target_title: str | None
    target_body: str
    target_author: Author
    target_status: ModerationStatus


class ModerationAction(BaseModel):
    reason: Annotated[str | None, Field(max_length=500), BlankToNone] = None
