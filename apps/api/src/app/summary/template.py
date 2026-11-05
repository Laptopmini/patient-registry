import re
from collections.abc import Sequence
from datetime import UTC, date

from app.summary.base import NoteForSummary

EMPTY_NARRATIVE = "No clinical notes have been recorded for this patient yet."
_SENTENCE_END = re.compile(r"(?<=[.!?])\s")
_MAX_SENTENCE = 200
_MAX_EARLIER = 4


def _day(note: NoteForSummary) -> date:
    return note.recorded_at.astimezone(UTC).date()


def _fmt(day: date) -> str:
    return f"{day.day} {day.strftime('%b %Y')}"


def first_sentence(body: str) -> str:
    text = " ".join(body.split())
    sentence = _SENTENCE_END.split(text, maxsplit=1)[0]
    if len(sentence) > _MAX_SENTENCE:
        sentence = sentence[: _MAX_SENTENCE - 1].rstrip() + "…"
    return sentence


class TemplateProvider:
    """Deterministic narrative built from the notes, with no external calls."""

    name = "template"

    async def generate(self, notes: Sequence[NoteForSummary]) -> str:
        if not notes:
            return EMPTY_NARRATIVE
        ordered = sorted(notes, key=lambda n: (n.recorded_at, str(n.id)))
        first, latest = ordered[0], ordered[-1]
        count = len(ordered)

        noun = "note" if count == 1 else "notes"
        if _day(first) == _day(latest):
            span = f"on {_fmt(_day(latest))}"
        else:
            span = f"between {_fmt(_day(first))} and {_fmt(_day(latest))}"
        paragraphs = [f"Based on {count} {noun} recorded {span}."]

        sentence = first_sentence(latest.body)
        paragraphs.append(f"The most recent encounter, on {_fmt(_day(latest))}, noted: {sentence}")

        earlier = ordered[:-1][-_MAX_EARLIER:]
        if earlier:
            items = "; ".join(f"{_fmt(_day(n))}: {first_sentence(n.body)}" for n in earlier)
            omitted = count - 1 - len(earlier)
            lead = (
                "Earlier encounters"
                if omitted == 0
                else f"Earlier encounters ({omitted} older omitted)"
            )
            paragraphs.append(f"{lead}, oldest first. {items}")
        return "\n\n".join(paragraphs)
