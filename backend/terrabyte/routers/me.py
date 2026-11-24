from fastapi import APIRouter, status

from terrabyte.errors import ApiError
from terrabyte.schemas.users import MeUpdate, PasswordChange, UserOut
from terrabyte.security import CurrentUser, DbSession, hash_password, verify_password
from terrabyte.services.users import ensure_unique

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserOut)
def get_me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("", response_model=UserOut)
def update_me(data: MeUpdate, user: CurrentUser, db: DbSession) -> UserOut:
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes and not changes["name"]:
        raise ApiError(422, "validation_error", "Name cannot be empty.")
    if changes.get("email"):
        ensure_unique(db, None, changes["email"], exclude_id=user.id)
    for key, value in changes.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: PasswordChange, user: CurrentUser, db: DbSession) -> None:
    if not verify_password(data.current_password, user.password_hash):
        raise ApiError(400, "wrong_password", "Current password is incorrect.")
    user.password_hash = hash_password(data.new_password)
    db.commit()
