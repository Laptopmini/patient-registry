import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class NoteForSummary:
    id: uuid.UUID
    recorded_at: datetime
    body: str


class SummaryProvider(Protocol):
    """Turns notes into a narrative. Providers see notes only, never patient identifiers."""

    name: str

    async def generate(self, notes: Sequence[NoteForSummary]) -> str: ...


class SummaryUnavailableError(Exception):
    """A provider could not produce a usable narrative; the caller falls back to the template."""
