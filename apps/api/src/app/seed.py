"""Synthetic seed data. Every patient, note and contact detail here is fake.

Names and addresses come from Faker (`en_US`, fixed seed), emails use `@example.com`
and phones use the fictional `555-01NN` range. Nothing is derived from real people.
Conditions and notes are age-appropriate: minors never get adult-only conditions
and adults never get paediatric well-child notes.
"""

import random
import re
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import structlog
from faker import Faker
from sqlalchemy import func, insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import BloodType, Note, Patient, PatientAllergy, PatientCondition, PatientStatus
from app.schemas.patient import calculate_age

log = structlog.get_logger("app.seed")

ADVISORY_LOCK_KEY = 20261105
HISTORY_DAYS = 400
AREA_CODES = ("415", "212", "312", "617", "206", "303", "404", "512", "602", "305")

ADULT_ONLY_CONDITIONS = (
    "Atrial fibrillation",
    "Hypertension",
    "Chronic kidney disease",
    "Osteoarthritis",
    "Hyperlipidemia",
    "Type 2 diabetes",
)
ADULT_CONDITIONS = (
    *ADULT_ONLY_CONDITIONS,
    "Asthma",
    "Hypothyroidism",
    "GERD",
    "Migraine",
    "Anxiety disorder",
)
PEDIATRIC_CONDITIONS = (
    "Asthma",
    "Eczema",
    "Allergic rhinitis",
    "ADHD",
    "Otitis media (recurrent)",
    "Iron-deficiency anemia",
)
ALLERGIES = (
    "Penicillin",
    "Peanuts",
    "Shellfish",
    "Latex",
    "Sulfa drugs",
    "Pollen",
    "Egg",
    "Dust mites",
    "Ibuprofen",
)

NO_NOTES_INDEXES = frozenset({3, 11})
LONG_NAME_INDEX = 7
LONG_NAME = ("Maximiliana-Josephine", "Vanderbilt-Okonkwo-Hargreaves")


@dataclass
class SeedPatient:
    row: dict[str, object]
    allergies: list[str]
    conditions: list[str]
    notes: list[tuple[datetime, str]] = field(default_factory=lambda: [])


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _random_time(rng: random.Random, start: datetime, end: datetime) -> datetime:
    span = max(int((end - start).total_seconds()), 1)
    return start + timedelta(seconds=rng.randrange(span))


def pediatric_weight_kg(age_years: float, rng: random.Random) -> float:
    """Roughly 3 kg + 2.5 kg per year to age 12, then about 4 kg per year."""
    base = 3 + 2.5 * min(age_years, 12) + 4 * max(age_years - 12, 0)
    return round(base * rng.uniform(0.92, 1.08), 1)


def _pediatric_note(rng: random.Random, age_years: float) -> str:
    kind = rng.choice(("well", "immunization", "illness"))
    if kind == "well":
        weight = pediatric_weight_kg(age_years, rng)
        return (
            f"Well-child check. Weight {weight} kg, growth tracking along expected percentile. "
            "Development on track for age. Reviewed nutrition and sleep with the parent."
        )
    if kind == "immunization":
        return (
            "Immunizations reviewed and up to date for age. "
            "Vaccine given without immediate reaction; observed for 15 minutes."
        )
    return rng.choice(
        (
            "Presented with mild cough and low-grade fever for two days. "
            "Advised fluids and rest, return if symptoms worsen.",
            "Ear pain for one day, no fever. Mild redness noted; watchful waiting advised.",
            "Seasonal sneezing and itchy eyes. Saline rinse and an antihistamine recommended.",
        )
    )


def _adult_note(rng: random.Random) -> str:
    systolic, diastolic = rng.randint(108, 152), rng.randint(66, 94)
    weight = round(rng.uniform(52, 118), 1)
    options = (
        f"Routine follow-up. Blood pressure {systolic}/{diastolic} mmHg, "
        f"weight {weight} kg. Continue current plan.",
        f"Fasting labs reviewed. LDL {rng.randint(70, 165)} mg/dL, "
        f"A1c {rng.uniform(5.0, 7.8):.1f}%. Discussed diet and adherence.",
        "Medication review completed. No adverse effects reported; refills authorised.",
        "Presented with a sore throat and mild fatigue for three days. "
        "Rapid test negative; supportive care advised.",
        f"Annual wellness visit. Blood pressure {systolic}/{diastolic} mmHg. "
        "Screening schedule reviewed with the patient.",
        "Reported lower back discomfort after lifting. Exam unremarkable; stretching advised.",
    )
    return rng.choice(options)


def generate_patients(
    count: int, seed_value: int, now: datetime | None = None
) -> list[SeedPatient]:
    """Build `count` synthetic patients deterministically (dates are relative to `now`)."""
    now = now or datetime.now(UTC)
    today = now.date()
    fake = Faker("en_US")
    fake.seed_instance(seed_value)
    rng = random.Random(seed_value)
    history_start = now - timedelta(days=HISTORY_DAYS)
    out: list[SeedPatient] = []

    for index in range(count):
        minor = index % 6 == 2 or rng.random() < 0.12
        if minor:
            dob = today - timedelta(days=rng.randint(0, 18 * 365 - 1))
        else:
            dob = today - timedelta(days=rng.randint(18 * 365 + 5, 92 * 365))
        born = datetime(dob.year, dob.month, dob.day, tzinfo=UTC)

        if index == LONG_NAME_INDEX:
            first, last = LONG_NAME
        else:
            first, last = fake.first_name(), fake.last_name()

        address: dict[str, object] = {
            "address_line1": None,
            "address_line2": None,
            "address_city": None,
            "address_region": None,
            "address_postal_code": None,
            "address_country": None,
        }
        if rng.random() < 0.9:
            address = {
                "address_line1": fake.street_address(),
                "address_line2": rng.choice((None, None, f"Apt {rng.randint(1, 40)}")),
                "address_city": fake.city(),
                "address_region": fake.state_abbr(),
                "address_postal_code": fake.postcode(),
                "address_country": "US",
            }

        created = _random_time(rng, max(history_start, born), now)
        has_email = rng.random() < 0.85
        phone = f"+1{rng.choice(AREA_CODES)}55501{rng.randint(0, 99):02d}"

        pool = PEDIATRIC_CONDITIONS if minor else ADULT_CONDITIONS
        conditions: list[str] = [*rng.sample(pool, rng.randint(0, 2 if minor else 3))]
        allergies: list[str] = [*rng.sample(ALLERGIES, rng.choice((0, 0, 1, 1, 2)))]

        row: dict[str, object] = {
            "id": uuid.UUID(int=rng.getrandbits(128), version=4),
            "first_name": first,
            "last_name": last,
            "date_of_birth": dob,
            "email": f"{_slug(first)}.{_slug(last)}{index}@example.com" if has_email else None,
            "phone": phone if rng.random() < 0.9 else None,
            **address,
            "blood_type": rng.choice(list(BloodType)),
            "status": rng.choices(list(PatientStatus), weights=(60, 20, 20))[0],
            "version": 1,
            "created_at": created,
            "updated_at": created,
        }
        patient = SeedPatient(row=row, allergies=allergies, conditions=conditions)

        note_count = 0 if index in NO_NOTES_INDEXES else rng.randint(0, 6)
        note_start = max(history_start, born)
        for _ in range(note_count):
            recorded = _random_time(rng, note_start, now - timedelta(hours=1))
            if calculate_age(dob, recorded.date()) < 18:
                age_at_note = (recorded.date() - dob).days / 365.25
                body = _pediatric_note(rng, age_at_note)
            else:
                body = _adult_note(rng)
            patient.notes.append((recorded, body))
        out.append(patient)
    return out


async def seed(sessionmaker: async_sessionmaker[AsyncSession], count: int, seed_value: int) -> int:
    """Insert synthetic patients if the table is empty. Returns how many were inserted."""
    if count <= 0:
        return 0
    patients = generate_patients(count, seed_value)
    async with sessionmaker() as session, session.begin():
        await session.execute(
            text("SELECT pg_advisory_xact_lock(:key)"), {"key": ADVISORY_LOCK_KEY}
        )
        existing = await session.scalar(select(func.count()).select_from(Patient))
        if existing:
            return 0
        await _insert(session, patients)
    log.info("seeded synthetic patients", count=len(patients))
    return len(patients)


def note_created_at(recorded_at: datetime, index: int, now: datetime) -> datetime:
    """Notes are typically written up shortly after the encounter: 15 minutes to about 4 hours."""
    return min(recorded_at + timedelta(minutes=15 + (index * 47) % 225), now)


async def _insert(session: AsyncSession, patients: list[SeedPatient]) -> None:
    now = datetime.now(UTC)
    await session.execute(insert(Patient), [p.row for p in patients])
    allergies: list[dict[str, object]] = []
    conditions: list[dict[str, object]] = []
    notes: list[dict[str, object]] = []
    for p in patients:
        pid = p.row["id"]
        allergies += [
            {"id": uuid.uuid4(), "patient_id": pid, "name": n, "position": i}
            for i, n in enumerate(p.allergies)
        ]
        conditions += [
            {"id": uuid.uuid4(), "patient_id": pid, "name": n, "position": i}
            for i, n in enumerate(p.conditions)
        ]
        notes += [
            {
                "id": uuid.uuid4(),
                "patient_id": pid,
                "recorded_at": at,
                "body": body,
                "created_at": note_created_at(at, i, now),
            }
            for i, (at, body) in enumerate(p.notes)
        ]
    for table, rows in ((PatientAllergy, allergies), (PatientCondition, conditions), (Note, notes)):
        if rows:
            await session.execute(insert(table), rows)
