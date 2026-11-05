"""ASGI entrypoint."""

from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


def create_app() -> FastAPI:
    app = FastAPI(title="Patient Registry API", version="0.1.0")

    @app.get("/health", tags=["health"])
    async def health() -> HealthResponse:  # pyright: ignore[reportUnusedFunction]
        return HealthResponse(status="ok")

    return app


app = create_app()
