from typing import Annotated

from fastapi import APIRouter, Body, Query

from terrabyte.errors import ApiError
from terrabyte.models import User, UserRole, UserStatus
from terrabyte.schemas.users import AdminUserOut, StatusChangeIn, UserPage
from terrabyte.security import AdminUser, DbSession
from terrabyte.services.users import change_status, list_users

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=UserPage)
def admin_list_users(
    _admin: AdminUser,
    db: DbSession,
    role: UserRole | None = None,
    status: UserStatus | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> UserPage:
    rows, total = list_users(db, role=role, status=status, q=q, limit=limit, offset=offset)
    return UserPage(
        items=[AdminUserOut.model_validate(u) for u in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/users/{user_id}", response_model=AdminUserOut)
def admin_get_user(user_id: int, _admin: AdminUser, db: DbSession) -> AdminUserOut:
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(404, "not_found", "User not found.")
    return AdminUserOut.model_validate(user)


def _action(action: str):
    def endpoint(
        user_id: int,
        admin: AdminUser,
        db: DbSession,
        data: Annotated[StatusChangeIn | None, Body()] = None,
    ) -> AdminUserOut:
        user = change_status(db, admin, user_id, action, data.reason if data else None)
        return AdminUserOut.model_validate(user)

    endpoint.__name__ = f"admin_{action}_user"
    return endpoint


for _name in ("approve", "reject", "suspend"):
    router.add_api_route(
        f"/users/{{user_id}}/{_name}",
        _action(_name),
        methods=["POST"],
        response_model=AdminUserOut,
        summary=f"{_name.capitalize()} a user (writes a notification to them)",
    )
