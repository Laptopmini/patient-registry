"""ASGI entrypoint and app factory."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from app.config import Settings
from app.db import create_engine, create_sessionmaker
from app.errors import PROBLEM_JSON, register_exception_handlers
from app.flags import init_flags, shutdown_flags
from app.logging import RequestLoggingMiddleware, configure_logging
from app.routers import notes, patients, summary
from app.seed import seed
from app.summary.cache import SummaryCache


class HealthResponse(BaseModel):
    status: str


def _problem_media_type(schema: dict[str, Any]) -> dict[str, Any]:
    """Advertise error responses as application/problem+json instead of application/json."""
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            for code, response in operation.get("responses", {}).items():
                content = response.get("content")
                if (
                    code.isdigit()
                    and int(code) >= 400
                    and content
                    and "application/json" in content
                ):
                    content[PROBLEM_JSON] = content.pop("application/json")
    return schema


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_level, settings.log_format)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        engine = create_engine(settings.database_url)
        app.state.engine = engine
        app.state.sessionmaker = create_sessionmaker(engine)
        await init_flags(settings)
        try:
            if settings.seed_on_startup:
                await seed(app.state.sessionmaker, settings.seed_patients, settings.seed_value)
            yield
        finally:
            await shutdown_flags()
            await engine.dispose()

    app = FastAPI(title="Patient Registry API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.summary_cache = SummaryCache()
    app.add_middleware(RequestLoggingMiddleware)
    register_exception_handlers(app)

    @app.get("/health", tags=["health"], operation_id="get_health")
    async def health() -> HealthResponse:  # pyright: ignore[reportUnusedFunction]
        return HealthResponse(status="ok")

    app.include_router(patients.router)
    app.include_router(notes.router)
    app.include_router(summary.router)

    base_openapi = app.openapi

    def openapi() -> dict[str, Any]:
        if app.openapi_schema is None:
            app.openapi_schema = _problem_media_type(base_openapi())
        return app.openapi_schema

    app.openapi = openapi
    return app


app = create_app()
