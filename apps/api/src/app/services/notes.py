import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Note
from app.schemas.note import NoteIn
from app.services.errors import NotFoundError
from app.services.patients import ensure_active


async def list_notes(session: AsyncSession, patient_id: uuid.UUID) -> list[Note]:
    await ensure_active(session, patient_id)
    result = await session.scalars(
        select(Note)
        .where(Note.patient_id == patient_id)
        .order_by(Note.recorded_at.desc(), Note.created_at.desc(), Note.id.asc())
    )
    return list(result)


async def create_note(session: AsyncSession, patient_id: uuid.UUID, data: NoteIn) -> Note:
    await ensure_active(session, patient_id)
    note = Note(
        id=uuid.uuid4(), patient_id=patient_id, recorded_at=data.recorded_at, body=data.body
    )
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note


async def get_note(session: AsyncSession, patient_id: uuid.UUID, note_id: uuid.UUID) -> Note:
    await ensure_active(session, patient_id)
    note = await session.scalar(
        select(Note).where(Note.id == note_id, Note.patient_id == patient_id)
    )
    if note is None:
        raise NotFoundError("Note")
    return note


async def delete_note(session: AsyncSession, patient_id: uuid.UUID, note_id: uuid.UUID) -> None:
    await ensure_active(session, patient_id)
    result = await session.execute(
        delete(Note).where(Note.id == note_id, Note.patient_id == patient_id).returning(Note.id)
    )
    if result.first() is None:
        await session.rollback()
        raise NotFoundError("Note")
    await session.commit()
