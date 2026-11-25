"""Crop disease check: upload a leaf photo for a chosen crop, keep a history, ask an expert."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from PIL import Image
from sqlalchemy import select

from terrabyte.disease.model import DiseaseModel, Prediction, load_model
from terrabyte.disease.treatments import info_for
from terrabyte.errors import ApiError
from terrabyte.models import DiseaseCheck, User, UserRole
from terrabyte.pagination import Paging, page_rows
from terrabyte.schemas.advisory import ConsultationIn
from terrabyte.schemas.common import Page
from terrabyte.schemas.disease import (
    AskExpertIn,
    CandidateOut,
    CropOut,
    DiseaseCheckOut,
    DiseaseModelInfo,
)
from terrabyte.security import DbSession, SettingsDep, require_role
from terrabyte.services import consultations as consultation_svc
from terrabyte.services.uploads import save_image

router = APIRouter(prefix="/disease", tags=["disease"])

FarmerUser = Annotated[User, Depends(require_role(UserRole.farmer))]


def get_model(request: Request) -> DiseaseModel | None:
    override = getattr(request.app.state, "disease_model", None)
    if override is not None:
        return override
    return load_model(request.app.state.settings.disease_model_dir)


ModelDep = Annotated[DiseaseModel | None, Depends(get_model)]


def _require(model: DiseaseModel | None) -> DiseaseModel:
    if model is None:
        raise ApiError(503, "model_not_installed", "The disease model is not installed.")
    return model


def _out(check: DiseaseCheck) -> DiseaseCheckOut:
    confident = check.status == "confident"
    top3 = []
    for i, c in enumerate(check.top3 or []):
        # Chemical options only for the top result of a confident check.
        info = info_for(c["class_id"], include_chemical=confident and i == 0)
        top3.append(CandidateOut(**c, info=info))
    return DiseaseCheckOut(
        id=check.id,
        crop=check.crop,
        status=check.status,
        reason=check.reason,
        image_url=f"/api/files/{check.image_path}",
        top3=top3,
        model_version=check.model_version,
        consultation_id=check.consultation_id,
        created_at=check.created_at,
    )


@router.get("/model", response_model=DiseaseModelInfo)
def model_info(_user: FarmerUser, model: ModelDep) -> DiseaseModelInfo:
    if model is None:
        return DiseaseModelInfo(available=False)
    crops = [
        CropOut(
            id=crop,
            name=model.crops.get(crop, crop),
            conditions=[model.conditions[model.classes[i]] for i in idx],
        )
        for crop, idx in model.crop_idx.items()
    ]
    return DiseaseModelInfo(
        available=True,
        version=model.version,
        crops=sorted(crops, key=lambda c: c.name),
        licence=model.meta.get("licence"),
    )


@router.post("/checks", response_model=DiseaseCheckOut, status_code=status.HTTP_201_CREATED)
async def check(
    farmer: FarmerUser,
    db: DbSession,
    settings: SettingsDep,
    model: ModelDep,
    file: Annotated[UploadFile, File()],
    crop: Annotated[str, Form(max_length=40)],
) -> DiseaseCheckOut:
    model = _require(model)
    if crop not in model.crop_idx:
        raise ApiError(422, "unsupported_crop", "This crop is not supported by the disease check.")
    saved = await save_image(
        file, settings.upload_dir, f"images/u{farmer.id}", settings.max_upload_bytes
    )
    with Image.open(settings.upload_dir / saved.relative_path) as img:
        img.load()
        result: Prediction = model.predict(img, crop)
    row = DiseaseCheck(
        user_id=farmer.id,
        crop=crop,
        image_path=saved.relative_path,
        status=result.status,
        reason=result.reason,
        top_class=result.top3[0].class_id if result.top3 else None,
        top_probability=result.top3[0].probability if result.top3 else None,
        top3=[
            {"class_id": c.class_id, "condition": c.condition, "probability": c.probability}
            for c in result.top3
        ],
        model_version=model.version,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.get("/checks", response_model=Page[DiseaseCheckOut])
def history(farmer: FarmerUser, db: DbSession, paging: Paging) -> Page[DiseaseCheckOut]:
    stmt = (
        select(DiseaseCheck)
        .where(DiseaseCheck.user_id == farmer.id)
        .order_by(DiseaseCheck.created_at.desc(), DiseaseCheck.id.desc())
    )
    rows, total = page_rows(db, stmt, paging)
    return Page(
        items=[_out(r) for r in rows], total=total, limit=paging.limit, offset=paging.offset
    )


def _own(db: DbSession, farmer: User, check_id: int) -> DiseaseCheck:
    row = db.get(DiseaseCheck, check_id)
    if row is None or row.user_id != farmer.id:
        raise ApiError(404, "not_found", "Disease check not found.")
    return row


@router.get("/checks/{check_id}", response_model=DiseaseCheckOut)
def get_check(check_id: int, farmer: FarmerUser, db: DbSession) -> DiseaseCheckOut:
    return _out(_own(db, farmer, check_id))


@router.post("/checks/{check_id}/ask-expert", response_model=DiseaseCheckOut)
def ask_expert(
    check_id: int, data: AskExpertIn, farmer: FarmerUser, db: DbSession, settings: SettingsDep
) -> DiseaseCheckOut:
    """Create a consultation with the photo and the model's top-3 attached (once per check)."""
    row = _own(db, farmer, check_id)
    if row.consultation_id is not None:
        raise ApiError(409, "already_asked", "An expert has already been asked about this photo.")
    lines = [f"Disease check #{row.id} ({row.crop}), model {row.model_version}: {row.status}."]
    if row.reason:
        lines.append(f"Reason: {row.reason}.")
    if row.top3:
        lines.append(
            "Model's top-3: "
            + "; ".join(f"{c['condition']} {round(100 * c['probability'])}%" for c in row.top3)
            + "."
        )
    if data.note and data.note.strip():
        lines.append(f"Farmer's note: {data.note.strip()}")
    consultation = consultation_svc.create(
        db,
        farmer,
        ConsultationIn(
            crop=row.crop,
            category="disease",
            question=" ".join(lines),
            image_path=row.image_path,
        ),
        settings.upload_dir,
    )
    row.consultation_id = consultation.id
    db.commit()
    db.refresh(row)
    return _out(row)
