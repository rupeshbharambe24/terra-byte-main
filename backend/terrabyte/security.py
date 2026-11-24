"""Password hashing, JWT access tokens and role-based FastAPI dependencies."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from terrabyte.config import Settings
from terrabyte.errors import ApiError
from terrabyte.models import User, UserRole, UserStatus

_hasher = PasswordHash.recommended()  # Argon2id
_DUMMY_HASH = _hasher.hash("timing-equaliser-not-a-password")
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        _hasher.verify(password, _DUMMY_HASH)  # keep timing similar for unknown users
        return False
    try:
        return _hasher.verify(password, password_hash)
    except Exception:  # malformed hash
        return False


def create_access_token(user: User, settings: Settings) -> tuple[str, int]:
    expires_in = settings.access_token_minutes * 60
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "role": user.role.value,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    token = jwt.encode(payload, settings.resolved_jwt_secret(), algorithm=settings.jwt_algorithm)
    return token, expires_in


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request):
    yield from request.app.state.db.session()


DbSession = Annotated[Session, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings_dep)]


def status_error(user_status: UserStatus) -> ApiError:
    messages = {
        UserStatus.pending: ("account_pending", "Your account is awaiting admin approval."),
        UserStatus.rejected: ("account_rejected", "Your registration was not approved."),
        UserStatus.suspended: ("account_suspended", "Your account has been suspended."),
    }
    code, message = messages[user_status]
    return ApiError(403, code, message)


def get_current_user(
    db: DbSession,
    settings: SettingsDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise ApiError(401, "not_authenticated", "Please log in.")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.resolved_jwt_secret(),
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "sub"]},
        )
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise ApiError(
            401, "invalid_token", "Your session has expired. Please log in again."
        ) from exc
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(401, "invalid_token", "Your session has expired. Please log in again.")
    if user.status != UserStatus.approved:
        raise status_error(user.status)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole) -> Callable[..., User]:
    """Dependency factory: the current user must have one of ``roles``."""

    allowed = set(roles)

    def _dependency(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise ApiError(403, "forbidden", "You do not have access to this resource.")
        return user

    return _dependency


AdminUser = Annotated[User, Depends(require_role(UserRole.admin))]
