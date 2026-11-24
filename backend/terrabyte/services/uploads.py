"""Validated image uploads: type and size checked, decoded and re-encoded with Pillow.

Re-encoding drops EXIF (including GPS) and anything that is not pixel data.
"""

from __future__ import annotations

import io
import uuid
import warnings
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from terrabyte.errors import ApiError

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_PIXELS = 40_000_000
MAX_SIDE = 2048  # stored images are downscaled to this
CHUNK = 64 * 1024


@dataclass(frozen=True)
class SavedImage:
    relative_path: str
    width: int
    height: int
    size_bytes: int


async def read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    buf = bytearray()
    while chunk := await upload.read(CHUNK):
        buf.extend(chunk)
        if len(buf) > max_bytes:
            raise ApiError(
                413, "payload_too_large", f"Image is larger than {max_bytes // (1024 * 1024)} MB."
            )
    return bytes(buf)


def reencode_image(raw: bytes) -> tuple[bytes, int, int]:
    """Decode ``raw`` and return (jpeg_bytes, width, height). Raises ApiError if invalid."""
    if not raw:
        raise ApiError(400, "empty_file", "The file is empty.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as probe:
                if probe.format not in ALLOWED_FORMATS:
                    raise ApiError(415, "unsupported_media_type", "Only JPEG, PNG or WebP images.")
                if probe.width * probe.height > MAX_PIXELS:
                    raise ApiError(413, "image_too_large", "Image dimensions are too large.")
                probe.verify()
            with Image.open(io.BytesIO(raw)) as img:
                img.load()
                img = ImageOps.exif_transpose(img)
                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGBA")
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    background.paste(img, mask=img.getchannel("A"))
                    img = background
                else:
                    img = img.convert("RGB")
                img.thumbnail((MAX_SIDE, MAX_SIDE))
                out = io.BytesIO()
                img.save(out, format="JPEG", quality=85, optimize=True)
                return out.getvalue(), img.width, img.height
    except ApiError:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise ApiError(415, "invalid_image", "The file is not a valid image.") from exc


async def save_image(
    upload: UploadFile, upload_dir: Path, subdir: str, max_bytes: int
) -> SavedImage:
    if (upload.content_type or "").lower() not in ALLOWED_TYPES:
        raise ApiError(415, "unsupported_media_type", "Only JPEG, PNG or WebP images.")
    raw = await read_limited(upload, max_bytes)
    data, width, height = reencode_image(raw)
    target_dir = upload_dir / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.jpg"
    (target_dir / name).write_bytes(data)
    return SavedImage(f"{subdir}/{name}", width, height, len(data))
