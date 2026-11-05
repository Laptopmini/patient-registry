from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from pydantic import AfterValidator, AwareDatetime, BaseModel, StringConstraints

CLOCK_SKEW = timedelta(seconds=60)


def _not_in_future(value: datetime) -> datetime:
    if value > datetime.now(UTC) + CLOCK_SKEW:
        raise ValueError("recorded_at cannot be in the future")
    return value


class NoteIn(BaseModel):
    recorded_at: Annotated[AwareDatetime, AfterValidator(_not_in_future)]
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class NoteOut(BaseModel):
    id: UUID
    patient_id: UUID
    recorded_at: datetime
    body: str
    created_at: datetime


class NoteList(BaseModel):
    items: list[NoteOut]
