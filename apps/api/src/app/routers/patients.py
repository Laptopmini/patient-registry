import uuid
from typing import Annotated

from fastapi import APIRouter, Header, Query, Response

from app.errors import PreconditionRequiredError, problem_responses
from app.models import BloodType, PatientStatus
from app.routers.deps import SessionDep, etag_for, parse_if_match
from app.schemas.patient import (
    PatientIn,
    PatientList,
    PatientOut,
    patient_list_item,
    patient_out,
)
from app.services import patients as service
from app.services.patients import ListParams, SortField

router = APIRouter(prefix="/patients", tags=["patients"])

IfMatch = Annotated[
    str | None,
    Header(description='The current ETag of the patient, for example `"3"`.'),
]


@router.get(
    "",
    operation_id="list_patients",
    responses=problem_responses(422),
)
async def list_patients(
    session: SessionDep,
    q: Annotated[
        str | None,
        Query(max_length=100, description="Matches the full name, email or phone."),
    ] = None,
    status: PatientStatus | None = None,
    blood_type: BloodType | None = None,
    condition: Annotated[str | None, Query(max_length=100)] = None,
    allergy: Annotated[str | None, Query(max_length=100)] = None,
    sort: SortField = SortField.LAST_NAME,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PatientList:
    params = ListParams(
        q=q,
        status=status,
        blood_type=blood_type,
        condition=condition,
        allergy=allergy,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    records, total = await service.list_patients(session, params)
    return PatientList(
        items=[patient_list_item(r.patient, r.last_visit) for r in records],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    operation_id="create_patient",
    status_code=201,
    responses=problem_responses(422),
)
async def create_patient(body: PatientIn, session: SessionDep, response: Response) -> PatientOut:
    record = await service.create_patient(session, body)
    out = patient_out(record.patient, record.last_visit)
    response.headers["Location"] = f"/patients/{out.id}"
    response.headers["ETag"] = etag_for(out.version)
    return out


@router.get(
    "/{patient_id}",
    operation_id="get_patient",
    responses=problem_responses(404, 422),
)
async def get_patient(patient_id: uuid.UUID, session: SessionDep, response: Response) -> PatientOut:
    record = await service.get_patient(session, patient_id)
    out = patient_out(record.patient, record.last_visit)
    response.headers["ETag"] = etag_for(out.version)
    return out


@router.put(
    "/{patient_id}",
    operation_id="replace_patient",
    responses=problem_responses(404, 412, 422, 428),
)
async def replace_patient(
    patient_id: uuid.UUID,
    body: PatientIn,
    session: SessionDep,
    response: Response,
    if_match: IfMatch = None,
) -> PatientOut:
    if if_match is None:
        raise PreconditionRequiredError
    record = await service.replace_patient(session, patient_id, body, parse_if_match(if_match))
    out = patient_out(record.patient, record.last_visit)
    response.headers["ETag"] = etag_for(out.version)
    return out


@router.delete(
    "/{patient_id}",
    operation_id="delete_patient",
    status_code=204,
    responses=problem_responses(404, 412, 422),
)
async def delete_patient(
    patient_id: uuid.UUID, session: SessionDep, if_match: IfMatch = None
) -> Response:
    expected = parse_if_match(if_match) if if_match is not None else None
    await service.archive_patient(session, patient_id, expected, check=if_match is not None)
    return Response(status_code=204)
