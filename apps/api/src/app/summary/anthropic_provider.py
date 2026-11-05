from collections.abc import Sequence

import anthropic
import structlog
from pydantic import BaseModel, Field

from app.summary.base import NoteForSummary, SummaryUnavailableError

SYSTEM_PROMPT = (
    "You summarise clinical notes for a patient registry. Summarise only what the notes say. "
    "Never invent diagnoses, medications, values or dates. Write in a neutral clinical register. "
    "Return 1 to 3 short paragraphs."
)

_log = structlog.get_logger(__name__)


class NarrativeOut(BaseModel):
    narrative: str = Field(description="The summary, in 1 to 3 short paragraphs.")


def build_notes_block(notes: Sequence[NoteForSummary]) -> str:
    """Notes only (timestamp and body, oldest first): no names, dates of birth or IDs."""
    ordered = sorted(notes, key=lambda n: (n.recorded_at, str(n.id)))
    return "\n\n".join(f"[{n.recorded_at.isoformat()}]\n{n.body}" for n in ordered)


class AnthropicProvider:
    """Summarises notes with Claude. Raises SummaryUnavailableError so callers can fall back."""

    name = "anthropic"

    def __init__(self, client: anthropic.AsyncAnthropic, model: str) -> None:
        self._client = client
        self._model = model

    async def generate(self, notes: Sequence[NoteForSummary]) -> str:
        try:
            response = await self._client.messages.parse(
                model=self._model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": build_notes_block(notes)}],
                output_format=NarrativeOut,
                output_config={"effort": "low"},
            )
        except (
            anthropic.RateLimitError,
            anthropic.APITimeoutError,
            anthropic.APIConnectionError,
            anthropic.APIStatusError,
        ) as exc:
            # Log the error class only, never note text, model output or the key.
            _log.warning("summary_provider_error", error=type(exc).__name__)
            raise SummaryUnavailableError from exc
        if response.stop_reason in ("refusal", "max_tokens"):
            _log.warning("summary_provider_unusable", stop_reason=response.stop_reason)
            raise SummaryUnavailableError
        parsed = response.parsed_output
        if parsed is None or not parsed.narrative.strip():
            _log.warning("summary_provider_unusable", stop_reason="empty")
            raise SummaryUnavailableError
        return parsed.narrative.strip()
