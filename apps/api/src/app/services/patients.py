"""Patient persistence and queries. No HTTP knowledge lives here."""

import enum
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import (
    ColumnElement,
    Select,
    Update,
    delete,
    exists,
    func,
    insert,
    literal_column,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import BloodType, Note, Patient, PatientAllergy, PatientCondition, PatientStatus
from app.schemas.patient import PatientIn
from app.services.errors import NotFoundError, VersionMismatchError


class SortField(enum.StrEnum):
    LAST_NAME = "last_name"
    LAST_NAME_DESC = "-last_name"
    FIRST_NAME = "first_name"
    FIRST_NAME_DESC = "-first_name"
    AGE = "age"
    AGE_DESC = "-age"
    LAST_VISIT = "last_visit"
    LAST_VISIT_DESC = "-last_visit"
    CREATED_AT = "created_at"
    CREATED_AT_DESC = "-created_at"


@dataclass(frozen=True)
class SortSpec:
    field: str
    descending: bool


def parse_sort(value: str) -> SortSpec:
    """Split `-field` into a field name and direction. Raises ValueError if not allowlisted."""
    allowed = {member.value for member in SortField}
    if value not in allowed:
        raise ValueError(f"Unsupported sort value: {value!r}")
    descending = value.startswith("-")
    return SortSpec(field=value.removeprefix("-"), descending=descending)


@dataclass(frozen=True)
class ListParams:
    q: str | None = None
    status: PatientStatus | None = None
    blood_type: BloodType | None = None
    condition: str | None = None
    allergy: str | None = None
    sort: SortField = SortField.LAST_NAME
    limit: int = 20
    offset: int = 0


@dataclass(frozen=True)
class PatientRecord:
    patient: Patient
    last_visit: datetime | None


def active_patients() -> Select[Any]:
    """The only way to select patients: archived rows are always excluded (ADR 0003)."""
    return select(Patient).where(Patient.archived_at.is_(None))


def _last_visit() -> ColumnElement[Any]:
    return (
        select(func.max(Note.recorded_at))
        .where(Note.patient_id == Patient.id)
        .correlate(Patient)
        .scalar_subquery()
    )


def escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _order_by(spec: SortSpec) -> list[ColumnElement[Any]]:
    desc = spec.descending
    match spec.field:
        case "last_name":
            keys = [func.lower(Patient.last_name), func.lower(Patient.first_name)]
        case "first_name":
            keys = [func.lower(Patient.first_name), func.lower(Patient.last_name)]
        case "age":
            # Older means an earlier date of birth, so the direction flips.
            return [
                Patient.date_of_birth.asc() if desc else Patient.date_of_birth.desc(),
                Patient.id.asc(),
            ]
        case "created_at":
            keys = [Patient.created_at]
        case _:
            visit = _last_visit()
            return [
                visit.desc().nulls_last() if desc else visit.asc().nulls_last(),
                Patient.id.asc(),
            ]
    ordered: list[ColumnElement[Any]] = [k.desc() if desc else k.asc() for k in keys]
    ordered.append(Patient.id.asc())
    return ordered


def _filters(params: ListParams) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    term = params.q.strip() if params.q else ""
    if term:
        pattern = f"%{escape_like(term)}%"
        full_name = Patient.first_name + literal_column("' '") + Patient.last_name
        conditions.append(
            full_name.ilike(pattern, escape="\\")
            | Patient.email.ilike(pattern, escape="\\")
            | Patient.phone.ilike(pattern, escape="\\")
        )
    if params.status is not None:
        conditions.append(Patient.status == params.status)
    if params.blood_type is not None:
        conditions.append(Patient.blood_type == params.blood_type)
    if params.condition and params.condition.strip():
        conditions.append(
            exists().where(
                PatientCondition.patient_id == Patient.id,
                func.lower(PatientCondition.name) == params.condition.strip().lower(),
            )
        )
    if params.allergy and params.allergy.strip():
        conditions.append(
            exists().where(
                PatientAllergy.patient_id == Patient.id,
                func.lower(PatientAllergy.name) == params.allergy.strip().lower(),
            )
        )
    return conditions


async def list_patients(
    session: AsyncSession, params: ListParams
) -> tuple[list[PatientRecord], int]:
    filters = _filters(params)
    total = await session.scalar(
        select(func.count()).select_from(Patient).where(Patient.archived_at.is_(None), *filters)
    )
    stmt = (
        select(Patient, _last_visit().label("last_visit"))
        .where(Patient.archived_at.is_(None), *filters)
        .order_by(*_order_by(parse_sort(params.sort.value)))
        .limit(params.limit)
        .offset(params.offset)
    )
    rows = (await session.execute(stmt)).all()
    return [PatientRecord(patient=r[0], last_visit=r[1]) for r in rows], total or 0


async def get_patient(session: AsyncSession, patient_id: uuid.UUID) -> PatientRecord:
    stmt = (
        active_patients()
        .add_columns(_last_visit().label("last_visit"))
        .where(Patient.id == patient_id)
        .options(selectinload(Patient.allergies), selectinload(Patient.conditions))
        .execution_options(populate_existing=True)
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        raise NotFoundError("Patient")
    return PatientRecord(patient=row[0], last_visit=row[1])


async def ensure_active(session: AsyncSession, patient_id: uuid.UUID) -> None:
    found = await session.scalar(
        select(Patient.id).where(Patient.id == patient_id, Patient.archived_at.is_(None))
    )
    if found is None:
        raise NotFoundError("Patient")


def _columns(data: PatientIn) -> dict[str, object]:
    address = data.address
    return {
        "first_name": data.first_name,
        "last_name": data.last_name,
        "date_of_birth": data.date_of_birth,
        "email": data.email,
        "phone": data.phone,
        "address_line1": address.line1 if address else None,
        "address_line2": address.line2 if address else None,
        "address_city": address.city if address else None,
        "address_region": address.region if address else None,
        "address_postal_code": address.postal_code if address else None,
        "address_country": address.country if address else None,
        "blood_type": data.blood_type,
        "status": data.status,
    }


async def create_patient(session: AsyncSession, data: PatientIn) -> PatientRecord:
    patient_id = uuid.uuid4()
    session.add(
        Patient(
            id=patient_id,
            **_columns(data),
            allergies=[
                PatientAllergy(name=item.name, position=i) for i, item in enumerate(data.allergies)
            ],
            conditions=[
                PatientCondition(name=item.name, position=i)
                for i, item in enumerate(data.conditions)
            ],
        )
    )
    await session.commit()
    return await get_patient(session, patient_id)


async def replace_patient(
    session: AsyncSession, patient_id: uuid.UUID, data: PatientIn, expected_version: int | None
) -> PatientRecord:
    """Full replacement. `expected_version=None` means the caller's ETag could not match."""
    stmt: Update = (
        update(Patient)
        .where(
            Patient.id == patient_id,
            Patient.archived_at.is_(None),
            Patient.version == expected_version,
        )
        .values(**_columns(data), version=Patient.version + 1, updated_at=func.now())
        .returning(Patient.id)
        .execution_options(synchronize_session=False)
    )
    updated = (await session.execute(stmt)).first()
    if updated is None:
        await session.rollback()
        await ensure_active(session, patient_id)
        raise VersionMismatchError
    await session.execute(delete(PatientAllergy).where(PatientAllergy.patient_id == patient_id))
    await session.execute(delete(PatientCondition).where(PatientCondition.patient_id == patient_id))
    if data.allergies:
        await session.execute(
            insert(PatientAllergy),
            [
                {"id": uuid.uuid4(), "patient_id": patient_id, "name": item.name, "position": i}
                for i, item in enumerate(data.allergies)
            ],
        )
    if data.conditions:
        await session.execute(
            insert(PatientCondition),
            [
                {"id": uuid.uuid4(), "patient_id": patient_id, "name": item.name, "position": i}
                for i, item in enumerate(data.conditions)
            ],
        )
    await session.commit()
    return await get_patient(session, patient_id)


async def archive_patient(
    session: AsyncSession, patient_id: uuid.UUID, expected_version: int | None, *, check: bool
) -> None:
    """Soft delete. With `check`, the version must match (`expected_version=None` never does)."""
    where = [Patient.id == patient_id, Patient.archived_at.is_(None)]
    if check:
        where.append(Patient.version == expected_version)
    result = await session.execute(
        update(Patient)
        .where(*where)
        .values(archived_at=func.now())
        .returning(Patient.id)
        .execution_options(synchronize_session=False)
    )
    if result.first() is None:
        await session.rollback()
        await ensure_active(session, patient_id)
        raise VersionMismatchError
    await session.commit()
