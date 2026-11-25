from typing import Annotated

from fastapi import APIRouter, File, UploadFile, status

from terrabyte.schemas.misc import UploadOut
from terrabyte.security import CurrentUser, SettingsDep
from terrabyte.services.uploads import save_image

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/image", response_model=UploadOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: Annotated[UploadFile, File()], user: CurrentUser, settings: SettingsDep
) -> UploadOut:
    saved = await save_image(
        file, settings.upload_dir, f"images/u{user.id}", settings.max_upload_bytes
    )
    return UploadOut(
        path=saved.relative_path,
        url=f"/api/files/{saved.relative_path}",
        width=saved.width,
        height=saved.height,
        bytes=saved.size_bytes,
    )
