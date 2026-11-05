from datetime import date, datetime
from typing import Annotated
from uuid import UUID

import phonenumbers
from pydantic import AfterValidator, BaseModel, EmailStr, Field, StringConstraints, field_validator

from app.models import BloodType, Patient, PatientStatus
from app.schemas.common import Name100

MAX_AGE_YEARS = 130


def calculate_age(date_of_birth: date, today: date) -> int:
    """Whole years between date of birth and today."""
    years = today.year - date_of_birth.year
    if (today.month, today.day) < (date_of_birth.month, date_of_birth.day):
        years -= 1
    return years


def _earliest_birth_date(today: date) -> date:
    try:
        return today.replace(year=today.year - MAX_AGE_YEARS)
    except ValueError:  # 29 February
        return today.replace(year=today.year - MAX_AGE_YEARS, day=28)


def normalize_phone(value: str) -> str:
    try:
        parsed = phonenumbers.parse(value, None)
    except phonenumbers.NumberParseException as exc:
        raise ValueError("Enter a phone number in international format, e.g. +14155550155") from exc
    if not phonenumbers.is_valid_number(parsed):
        raise ValueError("Enter a valid phone number in international format")
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def _check_date_of_birth(value: date) -> date:
    today = date.today()
    if value > today:
        raise ValueError("Date of birth cannot be in the future")
    if value < _earliest_birth_date(today):
        raise ValueError(f"Date of birth cannot be more than {MAX_AGE_YEARS} years ago")
    return value


Phone = Annotated[str, AfterValidator(normalize_phone)]
Country = Annotated[str, StringConstraints(pattern=r"^[A-Z]{2}$")]
_Optional100 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]


class Address(BaseModel):
    line1: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    line2: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None
    city: Name100
    region: _Optional100 | None = None
    postal_code: Annotated[str, StringConstraints(strip_whitespace=True, max_length=20)] | None = (
        None
    )
    country: Country = "US"


class NamedItem(BaseModel):
    name: Name100


def _unique_names(items: list[NamedItem]) -> list[NamedItem]:
    seen: set[str] = set()
    for item in items:
        key = item.name.lower()
        if key in seen:
            raise ValueError(f"Duplicate entry: {item.name}")
        seen.add(key)
    return items


NamedItems = Annotated[list[NamedItem], Field(max_length=50), AfterValidator(_unique_names)]


class PatientIn(BaseModel):
    first_name: Name100
    last_name: Name100
    date_of_birth: Annotated[date, AfterValidator(_check_date_of_birth)]
    email: EmailStr | None = None
    phone: Phone | None = None
    address: Address | None = None
    blood_type: BloodType = BloodType.UNKNOWN
    status: PatientStatus = PatientStatus.ACTIVE
    allergies: NamedItems = []
    conditions: NamedItems = []

    @field_validator("email", mode="before")
    @classmethod
    def _blank_email_is_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value


class PatientListItem(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    date_of_birth: date
    age: int
    status: PatientStatus
    blood_type: BloodType
    last_visit: datetime | None


class PatientList(BaseModel):
    items: list[PatientListItem]
    total: int
    limit: int
    offset: int


class PatientOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    date_of_birth: date
    age: int
    email: str | None
    phone: str | None
    address: Address | None
    blood_type: BloodType
    status: PatientStatus
    allergies: list[NamedItem]
    conditions: list[NamedItem]
    last_visit: datetime | None
    version: int
    created_at: datetime
    updated_at: datetime


def address_of(patient: Patient) -> Address | None:
    if patient.address_line1 is None or patient.address_city is None:
        return None
    return Address(
        line1=patient.address_line1,
        line2=patient.address_line2,
        city=patient.address_city,
        region=patient.address_region,
        postal_code=patient.address_postal_code,
        country=patient.address_country or "US",
    )


def patient_out(patient: Patient, last_visit: datetime | None) -> PatientOut:
    return PatientOut(
        id=patient.id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        date_of_birth=patient.date_of_birth,
        age=calculate_age(patient.date_of_birth, date.today()),
        email=patient.email,
        phone=patient.phone,
        address=address_of(patient),
        blood_type=patient.blood_type,
        status=patient.status,
        allergies=[NamedItem(name=a.name) for a in patient.allergies],
        conditions=[NamedItem(name=c.name) for c in patient.conditions],
        last_visit=last_visit,
        version=patient.version,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
    )


def patient_list_item(patient: Patient, last_visit: datetime | None) -> PatientListItem:
    return PatientListItem(
        id=patient.id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        date_of_birth=patient.date_of_birth,
        age=calculate_age(patient.date_of_birth, date.today()),
        status=patient.status,
        blood_type=patient.blood_type,
        last_visit=last_visit,
    )
