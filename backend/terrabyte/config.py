"""Application settings, read from environment variables and ``backend/.env``."""

from __future__ import annotations

import secrets
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    database_url: str = f"sqlite:///{DATA_DIR / 'terrabyte.db'}"
    jwt_secret: str | None = None
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 24 * 60
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:8080", "http://127.0.0.1:8080"]
    )
    host: str = "127.0.0.1"
    port: int = 8000
    upload_dir: Path = DATA_DIR / "uploads"
    max_upload_mb: int = 8
    data_gov_in_api_key: str | None = None

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def max_request_bytes(self) -> int:
        # Multipart overhead on top of the largest allowed file.
        return self.max_upload_bytes + 512 * 1024

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [o.strip() for o in value.split(",") if o.strip()]
        return value

    def resolved_jwt_secret(self) -> str:
        """Return the signing secret.

        In production ``JWT_SECRET`` is mandatory. In development a random secret is generated once
        and stored in ``backend/data/.jwt_secret`` (git-ignored) so tokens survive restarts.
        """
        if self.jwt_secret:
            return self.jwt_secret
        if self.is_production:
            raise RuntimeError("JWT_SECRET must be set in production")
        secret_file = DATA_DIR / ".jwt_secret"
        if secret_file.exists():
            return secret_file.read_text().strip()
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        secret = secrets.token_urlsafe(48)
        secret_file.write_text(secret)
        secret_file.chmod(0o600)
        self.jwt_secret = secret
        return secret


@lru_cache
def get_settings() -> Settings:
    return Settings()
