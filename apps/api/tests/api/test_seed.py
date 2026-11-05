import time

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings
from app.main import create_app
from app.models import Note, Patient
from app.seed import seed

SEED = 20261105


async def _count(sm: async_sessionmaker[AsyncSession], model: type) -> int:
    async with sm() as session:
        return await session.scalar(select(func.count()).select_from(model)) or 0


async def test_seed_is_idempotent(sessionmaker: async_sessionmaker[AsyncSession]) -> None:
    assert await seed(sessionmaker, 20, SEED) == 20
    notes = await _count(sessionmaker, Note)
    assert await seed(sessionmaker, 20, SEED) == 0
    assert await _count(sessionmaker, Patient) == 20
    assert await _count(sessionmaker, Note) == notes


async def test_seed_skips_when_any_patient_exists(
    sessionmaker: async_sessionmaker[AsyncSession], client: AsyncClient
) -> None:
    await client.post(
        "/patients", json={"first_name": "A", "last_name": "B", "date_of_birth": "1990-01-01"}
    )
    assert await seed(sessionmaker, 20, SEED) == 0
    assert await _count(sessionmaker, Patient) == 1


async def test_seed_zero_patients_is_a_noop(sessionmaker: async_sessionmaker[AsyncSession]) -> None:
    assert await seed(sessionmaker, 0, SEED) == 0


async def test_seeded_registry_is_usable_through_the_api(
    sessionmaker: async_sessionmaker[AsyncSession], client: AsyncClient
) -> None:
    await seed(sessionmaker, 20, SEED)
    body = (await client.get("/patients", params={"limit": 100})).json()
    assert body["total"] == 20
    without_visits = [i for i in body["items"] if i["last_visit"] is None]
    assert len(without_visits) >= 2
    first = body["items"][0]
    detail = (await client.get(f"/patients/{first['id']}")).json()
    assert detail["version"] == 1
    summary = await client.get(f"/patients/{first['id']}/summary")
    assert summary.status_code == 200


async def test_lifespan_seeds_on_startup_and_logs(
    migrated_url: str,
    sessionmaker: async_sessionmaker[AsyncSession],
    client: AsyncClient,
) -> None:
    from structlog.testing import capture_logs

    settings = Settings(database_url=migrated_url, seed_on_startup=True, seed_patients=5)
    application = create_app(settings)
    with capture_logs() as logs:
        for _ in range(2):  # a second startup must not add rows
            async with application.router.lifespan_context(application):
                pass
    assert await _count(sessionmaker, Patient) == 5
    seeded = [e for e in logs if e["event"] == "seeded synthetic patients"]
    assert [e["count"] for e in seeded] == [5]


async def test_seed_1000_patients_is_fast(sessionmaker: async_sessionmaker[AsyncSession]) -> None:
    start = time.perf_counter()
    assert await seed(sessionmaker, 1000, SEED) == 1000
    assert time.perf_counter() - start < 10
    assert await _count(sessionmaker, Patient) == 1000
