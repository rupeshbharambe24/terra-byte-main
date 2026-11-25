from fastapi import APIRouter, status

from terrabyte.errors import ApiError
from terrabyte.models import UserStatus
from terrabyte.schemas.users import LoginIn, RegisterIn, RegisterOut, TokenOut, UserOut
from terrabyte.security import (
    DbSession,
    SettingsDep,
    create_access_token,
    status_error,
    verify_password,
)
from terrabyte.services.users import find_by_identifier, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: DbSession, settings: SettingsDep) -> RegisterOut:
    user = register_user(db, data)
    out = RegisterOut(
        user=UserOut.model_validate(user), requires_approval=user.status == UserStatus.pending
    )
    if user.status == UserStatus.approved:
        out.access_token, out.expires_in = create_access_token(user, settings)
    return out


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: DbSession, settings: SettingsDep) -> TokenOut:
    user = find_by_identifier(db, data.identifier)
    if not verify_password(data.password, user.password_hash if user else None) or user is None:
        raise ApiError(401, "invalid_credentials", "Wrong mobile number/email or password.")
    if user.status != UserStatus.approved:
        raise status_error(user.status)
    token, expires_in = create_access_token(user, settings)
    return TokenOut(access_token=token, expires_in=expires_in, user=UserOut.model_validate(user))
