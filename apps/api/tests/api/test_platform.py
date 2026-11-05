"""Health, request IDs, logging, error handlers, OpenAPI contract and migrations."""

import json
import re

import pytest
import structlog
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from structlog.testing import capture_logs

from app.config import Settings
from app.export_openapi import OPENAPI_PATH, render_schema
from app.main import create_app
from tests.api.helpers import PROBLEM, assert_problem, create_patient
from tests.conftest import run_alembic

pytestmark = pytest.mark.usefixtures("app")


async def test_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "X-Request-ID" in response.headers


class TestRequestId:
    async def test_generated_when_absent(self, client: AsyncClient) -> None:
        first = (await client.get("/health")).headers["X-Request-ID"]
        second = (await client.get("/health")).headers["X-Request-ID"]
        assert re.fullmatch(r"[0-9a-f]{32}", first)
        assert first != second

    async def test_echoed_when_valid(self, client: AsyncClient) -> None:
        response = await client.get("/health", headers={"X-Request-ID": "trace-123.abc"})
        assert response.headers["X-Request-ID"] == "trace-123.abc"

    async def test_unsafe_value_is_replaced(self, client: AsyncClient) -> None:
        response = await client.get("/health", headers={"X-Request-ID": "bad id\twith spaces"})
        assert response.headers["X-Request-ID"] != "bad id\twith spaces"


class TestRequestLogging:
    async def test_one_request_event_without_query_string(self, client: AsyncClient) -> None:
        with capture_logs(processors=[structlog.contextvars.merge_contextvars]) as logs:
            await client.get("/health?x=1", headers={"X-Request-ID": "rid-1"})
        events = [e for e in logs if e["event"] == "request"]
        assert len(events) == 1
        event = events[0]
        assert event["method"] == "GET"
        assert event["path"] == "/health"
        assert event["status"] == 200
        assert event["request_id"] == "rid-1"
        assert event["duration_ms"] >= 0

    async def test_search_terms_and_patient_fields_never_logged(self, client: AsyncClient) -> None:
        await create_patient(client, first_name="Zebulon", email="zebulon.q@example.com")
        with capture_logs(processors=[structlog.contextvars.merge_contextvars]) as logs:
            await client.get("/patients", params={"q": "Zebulon", "allergy": "Penicillin"})
            await client.post(
                "/patients",
                json={"first_name": "Quentin", "last_name": "Secretname", "date_of_birth": "bad"},
            )
        dump = json.dumps(logs, default=str)
        for needle in ("Zebulon", "Quentin", "Secretname", "Penicillin", "zebulon.q", "q="):
            assert needle not in dump
        assert any(e["path"] == "/patients" for e in logs if e["event"] == "request")

    async def test_json_renderer_is_configured(self, capsys: pytest.CaptureFixture[str]) -> None:
        from app.logging import configure_logging

        try:
            configure_logging("INFO", "json")
            structlog.get_logger("t").info("hello", a=1)
            line = json.loads(capsys.readouterr().out.strip().splitlines()[-1])
            assert line["event"] == "hello" and line["level"] == "info" and "timestamp" in line
            configure_logging("INFO", "console")
            structlog.get_logger("t").info("hello")
            assert "hello" in capsys.readouterr().out
        finally:
            configure_logging("INFO", "json")


class TestErrorHandlers:
    async def test_unknown_route_is_problem_404(self, client: AsyncClient) -> None:
        assert_problem(await client.get("/nope"), 404)

    async def test_method_not_allowed_keeps_allow_header(self, client: AsyncClient) -> None:
        response = await client.patch("/patients")
        assert_problem(response, 405)
        assert "Allow" in response.headers

    async def test_unhandled_exception_is_generic_500(
        self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        async def boom(*_: object, **__: object) -> None:
            raise RuntimeError("secret internals: Jane Doe 1980-01-01")

        monkeypatch.setattr("app.routers.patients.service.list_patients", boom)
        with capture_logs() as logs:
            response = await client.get("/patients")
        body = assert_problem(response, 500)
        assert body["detail"] == "An unexpected error occurred."
        assert "secret" not in response.text and "Jane" not in response.text
        assert "Jane" not in json.dumps(logs, default=str)
        assert any(e["event"] == "unhandled_exception" for e in logs)
        assert any(e["event"] == "request" and e["status"] == 500 for e in logs)

    async def test_unhandled_handler_directly(self) -> None:
        from app.errors import _unhandled  # pyright: ignore[reportPrivateUsage]

        response = await _unhandled(None, RuntimeError("x"))  # pyright: ignore[reportArgumentType]
        assert response.status_code == 500
        assert response.media_type == PROBLEM


class TestFlagsAndStartup:
    async def test_app_starts_when_flagd_is_unreachable(self, migrated_url: str) -> None:
        settings = Settings(
            database_url=migrated_url,
            seed_on_startup=False,
            flagd_host="127.0.0.1",
            flagd_port=1,
        )
        application = create_app(settings)
        async with (
            application.router.lifespan_context(application),
            AsyncClient(transport=ASGITransport(app=application), base_url="http://t") as c,
        ):
            assert (await c.get("/health")).status_code == 200
        from openfeature import api

        from app.flags import is_enabled

        api.clear_providers()
        assert is_enabled("summary-provider-anthropic") is False

    def test_flag_defaults_are_false_with_default_provider(self) -> None:
        from app.flags import is_enabled

        assert is_enabled("does-not-exist") is False


class TestOpenApi:
    def test_committed_schema_matches_live_schema(self) -> None:
        assert OPENAPI_PATH.read_text(encoding="utf-8") == render_schema(), (
            "apps/api/openapi.json is stale. Run `uv run python -m app.export_openapi`."
        )

    def test_operation_ids_tags_and_problem_media_types(self) -> None:
        schema = json.loads(render_schema())
        ids: list[str] = []
        for path, item in schema["paths"].items():
            for method, op in item.items():
                ids.append(op["operationId"])
                assert op["tags"], (method, path)
                for code, response in op["responses"].items():
                    if int(code) >= 400:
                        assert list(response["content"]) == [PROBLEM], (method, path, code)
        assert len(ids) == len(set(ids))
        assert {
            "list_patients", "create_patient", "get_patient", "replace_patient", "delete_patient",
            "list_notes", "create_note", "get_note", "delete_note", "get_patient_summary",
            "get_health",
        } <= set(ids)  # fmt: skip
        assert "HTTPValidationError" not in schema["components"]["schemas"]


class TestMigrations:
    async def test_downgrade_and_upgrade_round_trip(
        self,
        database_url: str,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        admin = create_async_engine(database_url, isolation_level="AUTOCOMMIT")
        async with admin.connect() as conn:
            await conn.execute(text("DROP DATABASE IF EXISTS roundtrip"))
            await conn.execute(text("CREATE DATABASE roundtrip"))
        await admin.dispose()
        url = database_url.rsplit("/", 1)[0] + "/roundtrip"

        async def tables() -> set[str]:
            engine = create_async_engine(url)
            async with engine.connect() as conn:
                rows = await conn.execute(
                    text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
                )
                names = {r[0] for r in rows} - {"alembic_version"}
            await engine.dispose()
            return names

        expected = {"patients", "patient_allergies", "patient_conditions", "notes"}
        await run_alembic(url, "upgrade", "head", monkeypatch)
        assert await tables() == expected
        await run_alembic(url, "downgrade", "base", monkeypatch)
        assert await tables() == set()
        await run_alembic(url, "upgrade", "head", monkeypatch)
        assert await tables() == expected

    async def test_expected_indexes_exist(
        self, sessionmaker: async_sessionmaker[AsyncSession]
    ) -> None:
        async with sessionmaker() as session:
            rows = await session.execute(
                text("SELECT indexdef FROM pg_indexes WHERE schemaname='public'")
            )
            defs = " ".join(r[0] for r in rows)
        for fragment in (
            "gin_trgm_ops",
            "(first_name)::text || ' '::text",
            "WHERE (archived_at IS NULL)",
            "lower((name)::text)",
            "recorded_at DESC",
        ):
            assert fragment in defs, fragment
