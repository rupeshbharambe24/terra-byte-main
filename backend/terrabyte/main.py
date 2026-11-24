"""FastAPI application factory and ``terrabyte-api`` entry point."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from terrabyte import __version__
from terrabyte.config import Settings, get_settings
from terrabyte.db import Database
from terrabyte.errors import install_error_handlers
from terrabyte.middleware import BodySizeLimitMiddleware
from terrabyte.routers import (
    admin,
    advisory,
    auth,
    dashboard,
    farm,
    forum,
    health,
    market,
    me,
    notifications,
    rebuilding,
    rentals,
    uploads,
)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    settings.resolved_jwt_secret()  # fail fast if missing in production
    database = Database(settings.database_url)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        database.create_all()
        settings.upload_dir.mkdir(parents=True, exist_ok=True)
        yield
        database.engine.dispose()

    docs = not settings.is_production
    app = FastAPI(
        title="TerraByte API",
        version=__version__,
        debug=False,
        lifespan=lifespan,
        docs_url="/api/docs" if docs else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if docs else None,
    )
    app.state.settings = settings
    app.state.db = database

    install_error_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept-Language"],
    )
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_request_bytes)

    for module in (
        health,
        auth,
        me,
        admin,
        notifications,
        market,
        rentals,
        farm,
        advisory,
        forum,
        dashboard,
        uploads,
        rebuilding,
    ):
        app.include_router(module.router, prefix="/api")

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/api/files", StaticFiles(directory=settings.upload_dir), name="files")
    return app


def __getattr__(name: str) -> FastAPI:
    # Lets ``uvicorn terrabyte.main:app`` work without building an app at import time.
    if name == "app":
        return create_app()
    raise AttributeError(name)


def run() -> None:
    import uvicorn

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    settings = get_settings()
    uvicorn.run(
        "terrabyte.main:create_app",
        factory=True,
        host=settings.host,
        port=settings.port,
        server_header=False,
        proxy_headers=False,
    )
