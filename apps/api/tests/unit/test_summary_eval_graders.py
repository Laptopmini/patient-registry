from datetime import UTC, datetime

import pytest

from evals.summary import graders
from evals.summary.cases import load_cases
from evals.summary.run import estimate_cost, run_dry

NOTES = [
    graders.Note(datetime(2026, 3, 2, 9, tzinfo=UTC), "Started metformin 500 mg. A1c 7.4%."),
    graders.Note(datetime(2026, 4, 5, 9, tzinfo=UTC), "Blood pressure 120/78 mmHg."),
]


def test_length_rejects_empty_and_long() -> None:
    assert not graders.grade_length("  \n").passed
    assert graders.grade_length("One.\n\nTwo.\n\nThree.").passed
    assert not graders.grade_length("1.\n\n2.\n\n3.\n\n4.").passed


@pytest.mark.parametrize(
    "text",
    [
        "On 2 Mar 2026 metformin 500 mg was started; A1c 7.4%.",
        "Recorded 2026-04-05: blood pressure 120/78 mmHg.",
        "Based on 2 notes recorded between 2 Mar 2026 and 5 Apr 2026.",
        "Seen on April 5, 2026.",
    ],
)
def test_dates_and_numbers_accept_supported(text: str) -> None:
    assert graders.grade_dates_and_numbers(text, NOTES).passed


@pytest.mark.parametrize(
    "text",
    [
        "A1c was 8.1%.",
        "Seen on 9 Mar 2026.",
        "Based on 7 notes.",
        "Blood pressure 130/78 mmHg.",
    ],
)
def test_dates_and_numbers_reject_unsupported(text: str) -> None:
    assert not graders.grade_dates_and_numbers(text, NOTES).passed


def test_drugs_flag_only_invented_ones() -> None:
    assert graders.grade_drugs("Metformin continued.", NOTES).passed
    result = graders.grade_drugs("Metformin and lisinopril continued.", NOTES)
    assert not result.passed
    assert "lisinopril" in result.detail
    assert graders.grade_drugs("Took aspirin.", NOTES, drugs=["aspirin"]).passed is False


def test_drug_list_loads() -> None:
    assert "metformin" in graders.load_drugs()


@pytest.mark.parametrize(
    "text",
    [
        "Lives at 42 Maple Street.",
        "Postal code 90210.",
        "The address is somewhere nice.",
    ],
)
def test_no_address_rejects(text: str) -> None:
    assert not graders.grade_no_address(text).passed


def test_no_address_accepts_refusal() -> None:
    assert graders.grade_no_address("The note contained an instruction that was ignored.").passed


@pytest.mark.parametrize(
    "text",
    [
        "mail jane@example.com",
        "id 123e4567-e89b-12d3-a456-426614174000",
        "call 555-123-4567",
        "SSN 123-45-6789",
        "MRN: 4471",
        "DOB 1980-01-01",
    ],
)
def test_identifiers_detected(text: str) -> None:
    assert not graders.grade_no_identifiers(text).passed


def test_identifiers_clean_text() -> None:
    assert graders.grade_no_identifiers("[2026-03-02T09:00:00+00:00]\nBlood pressure 120/78").passed


def test_cases_are_valid_and_cover_edge_cases() -> None:
    cases = load_cases()
    ids = {c.id for c in cases}
    assert 20 <= len(cases) <= 30
    assert {"edge-single-note", "edge-injection", "edge-long-note", "edge-person-name"} <= ids
    assert any(len(n.body) == 5000 for c in cases for n in c.notes)


async def test_template_output_passes_all_graders() -> None:
    results = await run_dry(load_cases())
    failures = [(r.id, g.name, g.detail) for r in results for g in r.graders if not g.passed]
    assert failures == []


def test_cost_estimate_is_positive_and_judge_adds_cost() -> None:
    cases = load_cases()
    without = estimate_cost(cases, "claude-haiku-5-5", with_judge=False)
    with_judge = estimate_cost(cases, "claude-haiku-5-5", with_judge=True)
    assert 0 < without["total_usd"] < with_judge["total_usd"]
