import asyncio
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from testcontainers.community.postgres import PostgresContainer

from app.config import Settings
from app.main import create_app

API_ROOT = Path(__file__).resolve().parents[1]


def alembic_config() -> Config:
    return Config(str(API_ROOT / "alembic.ini"))


@pytest.fixture(scope="session")
def postgres() -> Iterator[PostgresContainer]:
    with PostgresContainer("postgres:18.6-alpine", driver="asyncpg") as container:
        yield container


@pytest.fixture(scope="session")
def database_url(postgres: PostgresContainer) -> str:
    return postgres.get_connection_url()


async def run_alembic(
    url: str, action: str, revision: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    # env.py reads DATABASE_URL through Settings and calls asyncio.run, so use a thread.
    monkeypatch.setenv("DATABASE_URL", url)
    func = command.upgrade if action == "upgrade" else command.downgrade
    await asyncio.to_thread(func, alembic_config(), revision)


@pytest.fixture(scope="session")
async def migrated_url(database_url: str) -> str:
    mp = pytest.MonkeyPatch()
    try:
        await run_alembic(database_url, "upgrade", "head", mp)
    finally:
        mp.undo()
    return database_url


@pytest.fixture(scope="session")
async def app(migrated_url: str) -> AsyncIterator[FastAPI]:
    settings = Settings(database_url=migrated_url, seed_on_startup=False)
    application = create_app(settings)
    async with application.router.lifespan_context(application):
        yield application


@pytest.fixture(scope="session")
def sessionmaker(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    return app.state.sessionmaker  # pyright: ignore[reportAny]


@pytest.fixture(autouse=True)
async def clean_db(request: pytest.FixtureRequest) -> None:
    if "app" not in request.fixturenames and "client" not in request.fixturenames:
        return
    sm: async_sessionmaker[AsyncSession] = request.getfixturevalue("sessionmaker")
    async with sm() as session:
        await session.execute(text("TRUNCATE patients CASCADE"))
        await session.commit()
    request.getfixturevalue("app").state.summary_cache._items.clear()


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
