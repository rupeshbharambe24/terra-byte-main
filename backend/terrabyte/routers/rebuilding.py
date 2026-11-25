"""Endpoints of the old prototype whose models are being rebuilt (Phase 3).

They answer HTTP 503 so the frontend can show an honest "being rebuilt" message instead of
results from the broken legacy models.
"""

from fastapi import APIRouter

from terrabyte.errors import ApiError

router = APIRouter(tags=["being rebuilt"])

_PATHS = [
    "/disease/{rest:path}",
]


def _being_rebuilt() -> None:
    raise ApiError(503, "being_rebuilt", "being rebuilt")


for _path in _PATHS:
    router.add_api_route(
        _path,
        _being_rebuilt,
        methods=["GET", "POST"],
        include_in_schema=False,
        name=f"rebuilding:{_path}",
    )
