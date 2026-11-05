import uuid
from datetime import UTC, date, datetime
from typing import cast

from fastapi import APIRouter, Request

from app.config import Settings
from app.errors import problem_responses
from app.routers.deps import SessionDep
from app.schemas.patient import calculate_age
from app.schemas.summary import SummaryOut
from app.services import notes as notes_service
from app.services import patients as patients_service
from app.summary.base import NoteForSummary
from app.summary.cache import CachedSummary, SummaryCache, cache_key
from app.summary.registry import select_provider

router = APIRouter(prefix="/patients/{patient_id}/summary", tags=["summary"])


@router.get("", operation_id="get_patient_summary", responses=problem_responses(404, 422))
async def get_patient_summary(
    patient_id: uuid.UUID, session: SessionDep, request: Request
) -> SummaryOut:
    record = await patients_service.get_patient(session, patient_id)
    patient = record.patient
    notes = [
        NoteForSummary(id=n.id, recorded_at=n.recorded_at, body=n.body)
        for n in await notes_service.list_notes(session, patient_id)
    ]

    settings = cast(Settings, request.app.state.settings)  # pyright: ignore[reportAny]
    cache = cast(SummaryCache, request.app.state.summary_cache)  # pyright: ignore[reportAny]
    provider = await select_provider(settings)

    key = cache_key(provider.name, notes)
    cached = cache.get(key)
    if cached is None:
        cached = CachedSummary(
            narrative=await provider.generate(notes), generated_at=datetime.now(UTC)
        )
        cache.put(key, cached)

    return SummaryOut(
        patient_id=patient.id,
        name=f"{patient.first_name} {patient.last_name}",
        age=calculate_age(patient.date_of_birth, date.today()),
        blood_type=patient.blood_type,
        conditions=[c.name for c in patient.conditions],
        allergies=[a.name for a in patient.allergies],
        narrative=cached.narrative,
        provider=provider.name,
        note_count=len(notes),
        generated_at=cached.generated_at,
    )
