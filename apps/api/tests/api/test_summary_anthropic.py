"""Anthropic summary provider, with a fake SDK client: no network."""

from collections.abc import Callable, Iterator
from types import SimpleNamespace
from typing import Any

import anthropic
import httpx2 as httpx
import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from pydantic import SecretStr

from app.config import Settings
from app.summary.anthropic_provider import SYSTEM_PROMPT, AnthropicProvider, NarrativeOut
from tests.api.helpers import add_note, create_patient


class FakeMessages:
    def __init__(self, outcome: Callable[[], Any]) -> None:
        self.outcome = outcome
        self.calls: list[dict[str, Any]] = []

    async def parse(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        return self.outcome()


def reply(narrative: str | None, stop_reason: str = "end_turn") -> Callable[[], Any]:
    parsed = None if narrative is None else NarrativeOut(narrative=narrative)
    return lambda: SimpleNamespace(stop_reason=stop_reason, parsed_output=parsed)


def raising(exc: Exception) -> Callable[[], Any]:
    def _raise() -> Any:
        raise exc

    return _raise


def _request() -> httpx.Request:
    return httpx.Request("POST", "https://api.anthropic.com/v1/messages")


def _response(status: int) -> httpx.Response:
    return httpx.Response(status, request=_request())


@pytest.fixture
def enable(app: FastAPI, monkeypatch: pytest.MonkeyPatch) -> Iterator[Callable[..., FakeMessages]]:
    original = (app.state.settings, app.state.anthropic_provider)  # pyright: ignore[reportAny]

    def _enable(outcome: Callable[[], Any], *, flag: bool = True, key: bool = True) -> FakeMessages:
        fake = FakeMessages(outcome)
        client: Any = SimpleNamespace(messages=fake)
        settings = Settings(
            database_url=app.state.settings.database_url,  # pyright: ignore[reportAny]
            seed_on_startup=False,
            anthropic_api_key=SecretStr("test-key") if key else None,
        )
        app.state.settings = settings
        provider = AnthropicProvider(client, settings.anthropic_model) if key else None
        app.state.anthropic_provider = provider
        monkeypatch.setattr("app.summary.registry.is_enabled", lambda _key: flag)  # pyright: ignore
        return fake

    yield _enable
    app.state.settings, app.state.anthropic_provider = original


async def _patient_with_note(client: AsyncClient) -> str:
    patient = await create_patient(client)
    await add_note(client, patient["id"], "Wheezing noted.", "2026-01-05T09:00:00Z")
    return patient["id"]


async def test_success_reports_anthropic(
    client: AsyncClient, enable: Callable[..., FakeMessages]
) -> None:
    fake = enable(reply("  A short narrative.  "))
    pid = await _patient_with_note(client)
    body = (await client.get(f"/patients/{pid}/summary")).json()
    assert body["provider"] == "anthropic"
    assert body["narrative"] == "A short narrative."
    assert len(fake.calls) == 1
    # Cached on the second call.
    await client.get(f"/patients/{pid}/summary")
    assert len(fake.calls) == 1


async def test_prompt_has_notes_only(
    client: AsyncClient, enable: Callable[..., FakeMessages]
) -> None:
    fake = enable(reply("ok"))
    patient = await create_patient(client)
    await add_note(client, patient["id"], "Second note.", "2026-02-05T09:00:00Z")
    await add_note(client, patient["id"], "First note.", "2026-01-05T09:00:00Z")
    await client.get(f"/patients/{patient['id']}/summary")
    call = fake.calls[0]
    assert call["model"] == "claude-haiku-5-5"
    assert call["system"] == SYSTEM_PROMPT
    assert call["output_format"] is NarrativeOut
    for forbidden in ("temperature", "top_p", "top_k", "thinking"):
        assert forbidden not in call
    sent = repr(call)
    for identifier in (
        patient["id"],
        "Ada",
        "Testington",
        "1980-05-01",
        "example.com",
        "+14155550155",
        "Synthetic Way",
    ):
        assert identifier not in sent
    content = call["messages"][0]["content"]
    assert content.index("First note.") < content.index("Second note.")
    assert "2026-01-05T09:00:00+00:00" in content


@pytest.mark.parametrize(
    "outcome",
    [
        reply(None, "refusal"),
        reply("partial", "max_tokens"),
        reply(None),
        reply("   "),
        raising(anthropic.RateLimitError("x", response=_response(429), body=None)),
        raising(anthropic.APITimeoutError(request=_request())),
        raising(anthropic.APIConnectionError(request=_request())),
        raising(anthropic.APIStatusError("x", response=_response(500), body=None)),
    ],
    ids=[
        "refusal", "max_tokens", "missing", "empty",
        "rate_limit", "timeout", "connection", "status",
    ],
)  # fmt: skip
async def test_failures_fall_back_to_template(
    client: AsyncClient, enable: Callable[..., FakeMessages], outcome: Callable[[], Any]
) -> None:
    enable(outcome)
    pid = await _patient_with_note(client)
    response = await client.get(f"/patients/{pid}/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "template"
    assert "Based on 1 note recorded on 5 Jan 2026." in body["narrative"]


async def test_flag_off_uses_template(
    client: AsyncClient, enable: Callable[..., FakeMessages]
) -> None:
    fake = enable(reply("ok"), flag=False)
    pid = await _patient_with_note(client)
    assert (await client.get(f"/patients/{pid}/summary")).json()["provider"] == "template"
    assert fake.calls == []


async def test_no_key_uses_template(
    client: AsyncClient, enable: Callable[..., FakeMessages]
) -> None:
    fake = enable(reply("ok"), key=False)
    pid = await _patient_with_note(client)
    assert (await client.get(f"/patients/{pid}/summary")).json()["provider"] == "template"
    assert fake.calls == []
