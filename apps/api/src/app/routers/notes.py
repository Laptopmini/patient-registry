import uuid

from fastapi import APIRouter, Response

from app.errors import problem_responses
from app.models import Note
from app.routers.deps import SessionDep
from app.schemas.note import NoteIn, NoteList, NoteOut
from app.services import notes as service

router = APIRouter(prefix="/patients/{patient_id}/notes", tags=["notes"])


def _out(note: Note) -> NoteOut:
    return NoteOut(
        id=note.id,
        patient_id=note.patient_id,
        recorded_at=note.recorded_at,
        body=note.body,
        created_at=note.created_at,
    )


@router.get("", operation_id="list_notes", responses=problem_responses(404, 422))
async def list_notes(patient_id: uuid.UUID, session: SessionDep) -> NoteList:
    return NoteList(items=[_out(n) for n in await service.list_notes(session, patient_id)])


@router.post(
    "",
    operation_id="create_note",
    status_code=201,
    responses=problem_responses(404, 422),
)
async def create_note(
    patient_id: uuid.UUID, body: NoteIn, session: SessionDep, response: Response
) -> NoteOut:
    note = await service.create_note(session, patient_id, body)
    response.headers["Location"] = f"/patients/{patient_id}/notes/{note.id}"
    return _out(note)


@router.get("/{note_id}", operation_id="get_note", responses=problem_responses(404, 422))
async def get_note(patient_id: uuid.UUID, note_id: uuid.UUID, session: SessionDep) -> NoteOut:
    return _out(await service.get_note(session, patient_id, note_id))


@router.delete(
    "/{note_id}",
    operation_id="delete_note",
    status_code=204,
    responses=problem_responses(404, 422),
)
async def delete_note(patient_id: uuid.UUID, note_id: uuid.UUID, session: SessionDep) -> Response:
    await service.delete_note(session, patient_id, note_id)
    return Response(status_code=204)
