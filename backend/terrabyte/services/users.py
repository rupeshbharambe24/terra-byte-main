"""User registration, lookup and admin status transitions."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from terrabyte.db import utcnow
from terrabyte.errors import ApiError
from terrabyte.models import User, UserRole, UserStatus
from terrabyte.schemas.common import normalize_phone
from terrabyte.schemas.users import RegisterIn
from terrabyte.security import hash_password
from terrabyte.services.notifications import notify

SELF_REGISTER_ROLES = {UserRole.farmer, UserRole.vendor, UserRole.hardware_vendor, UserRole.expert}


def initial_status(role: UserRole) -> UserStatus:
    """Farmers are active at once; every other role waits for an admin."""
    return UserStatus.approved if role == UserRole.farmer else UserStatus.pending


def find_by_identifier(db: Session, identifier: str) -> User | None:
    identifier = identifier.strip()
    if "@" in identifier:
        return db.scalar(select(User).where(func.lower(User.email) == identifier.lower()))
    return db.scalar(select(User).where(User.phone == normalize_phone(identifier)))


def ensure_unique(db: Session, phone: str | None, email: str | None, exclude_id: int | None = None):
    if phone:
        q = select(User.id).where(User.phone == phone)
        if exclude_id is not None:
            q = q.where(User.id != exclude_id)
        if db.scalar(q) is not None:
            raise ApiError(409, "phone_taken", "This mobile number is already registered.")
    if email:
        q = select(User.id).where(func.lower(User.email) == email.lower())
        if exclude_id is not None:
            q = q.where(User.id != exclude_id)
        if db.scalar(q) is not None:
            raise ApiError(409, "email_taken", "This email is already registered.")


def register_user(db: Session, data: RegisterIn) -> User:
    if data.role not in SELF_REGISTER_ROLES:
        raise ApiError(403, "role_not_allowed", "This role cannot be registered here.")
    ensure_unique(db, data.phone, data.email)
    user = User(
        name=data.name,
        phone=data.phone,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        status=initial_status(data.role),
        preferred_language=data.preferred_language,
        organization=data.organization,
        qualifications=data.qualifications,
        state=data.state,
        district=data.district,
        village=data.village,
    )
    db.add(user)
    db.flush()
    if user.status == UserStatus.pending:
        for admin_id in db.scalars(
            select(User.id).where(User.role == UserRole.admin, User.status == UserStatus.approved)
        ):
            notify(
                db,
                admin_id,
                "approval_requested",
                f"New {user.role.value.replace('_', ' ')} awaiting approval",
                f"{user.name} ({user.phone}) registered and needs approval.",
                "/admin-vendor-approvals",
            )
    db.commit()
    db.refresh(user)
    return user


def list_users(
    db: Session,
    *,
    role: UserRole | None = None,
    status: UserStatus | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[User], int]:
    stmt = select(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if status is not None:
        stmt = stmt.where(User.status == status)
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.name).like(like),
                User.phone.like(like),
                func.lower(func.coalesce(User.email, "")).like(like),
                func.lower(func.coalesce(User.organization, "")).like(like),
                func.lower(func.coalesce(User.district, "")).like(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(User.created_at.desc(), User.id.desc()).limit(limit).offset(offset)
    )
    return list(rows), total


# Allowed admin transitions: action -> (allowed source statuses, target status).
TRANSITIONS: dict[str, tuple[set[UserStatus], UserStatus]] = {
    "approve": (
        {UserStatus.pending, UserStatus.rejected, UserStatus.suspended},
        UserStatus.approved,
    ),
    "reject": ({UserStatus.pending}, UserStatus.rejected),
    "suspend": ({UserStatus.approved}, UserStatus.suspended),
}

_MESSAGES = {
    "approve": (
        "account_approved",
        "Your account has been approved",
        "You can now log in and use TerraByte.",
    ),
    "reject": ("account_rejected", "Your registration was not approved", None),
    "suspend": ("account_suspended", "Your account has been suspended", None),
}


def change_status(db: Session, admin: User, user_id: int, action: str, reason: str | None) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(404, "not_found", "User not found.")
    if user.role == UserRole.admin:
        raise ApiError(403, "cannot_modify_admin", "Admin accounts are managed from the CLI.")
    sources, target = TRANSITIONS[action]
    if user.status == target:
        return user
    if user.status not in sources:
        raise ApiError(
            409,
            "invalid_transition",
            f"Cannot {action} a user whose status is {user.status.value}.",
        )
    user.status = target
    user.status_reason = reason
    user.status_changed_at = utcnow()
    type_, title, body = _MESSAGES[action]
    if reason:
        body = f"{body + ' ' if body else ''}Reason: {reason}"
    notify(db, user.id, type_, title, body)
    db.commit()
    db.refresh(user)
    _ = admin  # recorded for future audit log
    return user
