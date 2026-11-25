from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field


class CropOut(BaseModel):
    id: str
    name: str
    conditions: list[str]


class DiseaseModelInfo(BaseModel):
    available: bool
    version: str | None = None
    crops: list[CropOut] = []
    licence: str | None = None


class CandidateOut(BaseModel):
    class_id: str
    condition: str
    probability: float
    info: dict[str, Any] | None = None


class DiseaseCheckOut(BaseModel):
    id: int
    crop: str
    status: Literal["confident", "uncertain", "rejected"]
    reason: str | None
    image_url: str
    top3: list[CandidateOut]
    model_version: str
    consultation_id: int | None
    created_at: datetime


class AskExpertIn(BaseModel):
    note: Annotated[str | None, Field(max_length=2000)] = None
