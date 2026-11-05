import random
from datetime import UTC, datetime

import phonenumbers

from app.schemas.patient import PatientIn, calculate_age, normalize_phone
from app.seed import (
    ADULT_ONLY_CONDITIONS,
    PEDIATRIC_CONDITIONS,
    generate_patients,
    pediatric_weight_kg,
)

NOW = datetime(2026, 11, 5, 12, 0, tzinfo=UTC)


def _age(row: dict[str, object]) -> int:
    dob = row["date_of_birth"]
    assert hasattr(dob, "year")
    return calculate_age(dob, NOW.date())  # pyright: ignore[reportArgumentType]


def test_deterministic_for_a_fixed_seed() -> None:
    first = generate_patients(30, 1, NOW)
    second = generate_patients(30, 1, NOW)
    assert [p.row for p in first] == [p.row for p in second]
    assert [p.notes for p in first] == [p.notes for p in second]


def test_no_minor_has_an_adult_only_condition() -> None:
    patients = generate_patients(1000, 20261105, NOW)
    minors = [p for p in patients if _age(p.row) < 18]
    assert len(minors) > 50
    for patient in minors:
        assert set(patient.conditions) <= set(PEDIATRIC_CONDITIONS)
        assert not set(patient.conditions) & set(ADULT_ONLY_CONDITIONS)


def test_minor_notes_are_pediatric_and_weights_plausible() -> None:
    for patient in generate_patients(500, 7, NOW):
        for recorded_at, body in patient.notes:
            # Notes are age-appropriate for the patient's age when the note was recorded.
            age = calculate_age(patient.row["date_of_birth"], recorded_at.date())  # pyright: ignore[reportArgumentType]
            if age < 18:
                assert "LDL" not in body
                assert "A1c" not in body
                assert "Annual wellness" not in body
            else:
                assert "Well-child" not in body
                assert "Immunizations" not in body
            if "weight " in body and age >= 18:
                kg = float(body.split("weight ")[1].split(" kg")[0])
                assert 50 <= kg <= 120


def test_pediatric_weight_curve() -> None:
    rng = random.Random(1)
    assert 2.5 <= pediatric_weight_kg(0, rng) <= 3.5
    assert 12 <= pediatric_weight_kg(4, rng) <= 15
    assert 29 <= pediatric_weight_kg(12, rng) <= 37


def test_first_twenty_shape() -> None:
    patients = generate_patients(20, 20261105, NOW)
    assert len(patients) == 20
    assert sum(1 for p in patients if not p.notes) >= 2
    assert any(
        len(str(p.row["last_name"])) > 20 and "-" in str(p.row["last_name"]) for p in patients
    )
    assert any(_age(p.row) < 18 for p in patients)


def test_rows_pass_api_validation_and_notes_are_in_the_past() -> None:
    for patient in generate_patients(200, 3, NOW):
        row = patient.row
        phone = row["phone"]
        if phone is not None:
            assert normalize_phone(str(phone)) == phone
            parsed = phonenumbers.parse(str(phone))
            assert str(parsed.national_number)[3:8] == "55501"
        email = row["email"]
        assert email is None or str(email).endswith("@example.com")
        PatientIn.model_validate(
            {
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "date_of_birth": row["date_of_birth"],
                "email": email,
                "phone": phone,
                "allergies": [{"name": n} for n in patient.allergies],
                "conditions": [{"name": n} for n in patient.conditions],
            }
        )
        for recorded_at, _ in patient.notes:
            assert recorded_at < NOW
            assert recorded_at.date() >= row["date_of_birth"]  # pyright: ignore[reportOperatorIssue]


def test_note_created_at_follows_the_encounter_and_never_the_future() -> None:
    from datetime import UTC, datetime, timedelta

    from app.seed import note_created_at

    now = datetime(2026, 11, 5, 12, tzinfo=UTC)
    past = now - timedelta(days=30)
    for i in range(10):
        created = note_created_at(past, i, now)
        assert past + timedelta(minutes=15) <= created <= past + timedelta(hours=4)
    assert note_created_at(now - timedelta(minutes=5), 3, now) == now
