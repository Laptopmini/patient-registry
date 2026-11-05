import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.routers.deps import etag_for, parse_if_match
from app.schemas.note import NoteIn
from app.schemas.patient import PatientIn, calculate_age, normalize_phone
from app.services.patients import SortField, escape_like, parse_sort
from app.summary.base import NoteForSummary
from app.summary.cache import CachedSummary, SummaryCache, cache_key
from app.summary.registry import select_provider
from app.summary.template import EMPTY_NARRATIVE, TemplateProvider, first_sentence

VALID = {"first_name": "Ada", "last_name": "Test", "date_of_birth": "1980-05-01"}


def _note(day: int, body: str, note_id: int = 1) -> NoteForSummary:
    return NoteForSummary(
        id=uuid.UUID(int=note_id),
        recorded_at=datetime(2026, 3, day, 10, 0, tzinfo=UTC),
        body=body,
    )


class TestAge:
    def test_before_and_after_birthday(self) -> None:
        dob = date(2000, 6, 15)
        assert calculate_age(dob, date(2026, 6, 14)) == 25
        assert calculate_age(dob, date(2026, 6, 15)) == 26

    def test_leap_day_birthday(self) -> None:
        assert calculate_age(date(2000, 2, 29), date(2026, 2, 28)) == 25
        assert calculate_age(date(2000, 2, 29), date(2026, 3, 1)) == 26

    def test_newborn_is_zero(self) -> None:
        assert calculate_age(date(2026, 1, 1), date(2026, 6, 1)) == 0


class TestPhoneAndEmail:
    def test_phone_is_normalized_to_e164(self) -> None:
        assert normalize_phone("+1 415-555-0155") == "+14155550155"

    @pytest.mark.parametrize("value", ["4155550155", "+1 123", "abc", "+999999999999999"])
    def test_invalid_phone_rejected(self, value: str) -> None:
        with pytest.raises(ValueError, match="phone"):
            normalize_phone(value)

    def test_invalid_email_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PatientIn.model_validate({**VALID, "email": "not-an-email"})

    def test_blank_email_becomes_none(self) -> None:
        assert PatientIn.model_validate({**VALID, "email": "  "}).email is None


class TestPatientValidation:
    def test_future_birth_date_rejected(self) -> None:
        future = (date.today() + timedelta(days=1)).isoformat()
        with pytest.raises(ValidationError):
            PatientIn.model_validate({**VALID, "date_of_birth": future})

    def test_birth_date_over_130_years_ago_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PatientIn.model_validate({**VALID, "date_of_birth": "1800-01-01"})

    def test_duplicate_allergies_case_insensitive(self) -> None:
        with pytest.raises(ValidationError):
            PatientIn.model_validate(
                {**VALID, "allergies": [{"name": "Latex"}, {"name": " latex "}]}
            )

    def test_names_are_trimmed_and_defaults_applied(self) -> None:
        patient = PatientIn.model_validate(
            {**VALID, "first_name": "  Ada  ", "address": {"line1": "1 Main", "city": "X"}}
        )
        assert patient.first_name == "Ada"
        assert patient.address is not None
        assert patient.address.country == "US"
        assert patient.status == "active"
        assert patient.blood_type == "unknown"

    def test_lowercase_country_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PatientIn.model_validate(
                {**VALID, "address": {"line1": "1 Main", "city": "X", "country": "us"}}
            )


class TestNoteValidation:
    def test_naive_timestamp_rejected(self) -> None:
        with pytest.raises(ValidationError):
            NoteIn.model_validate({"recorded_at": "2026-01-01T10:00:00", "body": "x"})

    def test_future_rejected_but_small_skew_allowed(self) -> None:
        now = datetime.now(UTC)
        NoteIn.model_validate(
            {"recorded_at": (now + timedelta(seconds=30)).isoformat(), "body": "x"}
        )
        with pytest.raises(ValidationError):
            NoteIn.model_validate(
                {"recorded_at": (now + timedelta(minutes=5)).isoformat(), "body": "x"}
            )

    def test_blank_body_rejected(self) -> None:
        with pytest.raises(ValidationError):
            NoteIn.model_validate({"recorded_at": "2026-01-01T10:00:00Z", "body": "   "})


class TestSort:
    def test_ascending_and_descending(self) -> None:
        assert parse_sort("last_name").descending is False
        spec = parse_sort("-last_visit")
        assert (spec.field, spec.descending) == ("last_visit", True)

    @pytest.mark.parametrize("value", ["email", "-email", "", "last_name; DROP TABLE", "--age"])
    def test_unknown_rejected(self, value: str) -> None:
        with pytest.raises(ValueError, match="sort"):
            parse_sort(value)

    def test_every_allowlisted_value_parses(self) -> None:
        for member in SortField:
            parse_sort(member.value)

    def test_escape_like(self) -> None:
        assert escape_like(r"50%_\x") == r"50\%\_\\x"


class TestIfMatch:
    def test_parse(self) -> None:
        assert parse_if_match('"3"') == 3
        assert parse_if_match('W/"3"') == 3
        assert parse_if_match("abc") is None
        assert parse_if_match('"-1"') is None
        assert etag_for(7) == '"7"'


class TestTemplateProvider:
    async def test_no_notes(self) -> None:
        assert await TemplateProvider().generate([]) == EMPTY_NARRATIVE

    async def test_single_note(self) -> None:
        text = await TemplateProvider().generate([_note(5, "Mild cough. Rest advised.")])
        assert "Based on 1 note recorded on 5 Mar 2026." in text
        assert "noted: Mild cough." in text
        assert "Earlier" not in text

    async def test_multiple_notes_chronology_and_determinism(self) -> None:
        notes = [
            _note(9, "Latest visit. More.", 3),
            _note(1, "First visit.", 1),
            _note(4, "Middle.", 2),
        ]
        provider = TemplateProvider()
        text = await provider.generate(notes)
        assert text == await provider.generate(list(reversed(notes)))
        assert "Based on 3 notes recorded between 1 Mar 2026 and 9 Mar 2026." in text
        assert "most recent encounter, on 9 Mar 2026, noted: Latest visit." in text
        assert text.index("1 Mar 2026: First visit.") < text.index("4 Mar 2026: Middle.")
        assert len(text.split("\n\n")) == 3

    async def test_old_encounters_are_omitted(self) -> None:
        notes = [_note(d, f"Visit {d}.", d) for d in range(1, 9)]
        text = await TemplateProvider().generate(notes)
        assert "3 older omitted" in text

    def test_first_sentence_truncates(self) -> None:
        assert first_sentence("A" * 500).endswith("…")
        assert len(first_sentence("A" * 500)) == 200


class TestCache:
    def test_key_depends_on_provider_and_note_content(self) -> None:
        a = [_note(1, "x")]
        assert cache_key("template", a) == cache_key("template", [_note(1, "x")])
        assert cache_key("template", a) != cache_key("anthropic", a)
        assert cache_key("template", a) != cache_key("template", [_note(1, "y")])
        assert cache_key("template", a) != cache_key("template", [_note(2, "x")])
        assert cache_key("template", a) != cache_key("template", [_note(1, "x", note_id=2)])

    def test_lru_eviction(self) -> None:
        cache = SummaryCache(max_size=2)
        now = datetime.now(UTC)
        for key in ("a", "b"):
            cache.put(key, CachedSummary(key, now))
        assert cache.get("a") is not None  # "b" is now the least recently used
        cache.put("c", CachedSummary("c", now))
        assert cache.get("b") is None
        assert cache.get("a") is not None
        assert len(cache) == 2


class TestProviderSelection:
    class _Fake:
        name = "anthropic"

        async def generate(self, notes: object) -> str:
            return "x"

    async def test_default_is_template(self) -> None:
        assert (await select_provider(Settings())).name == "template"

    async def test_flag_on_without_key_falls_back(self) -> None:
        provider = await select_provider(Settings(), lambda _: True, self._Fake())
        assert provider.name == "template"

    async def test_flag_off_with_key_falls_back(self) -> None:
        settings = Settings(anthropic_api_key="k")  # pyright: ignore[reportArgumentType]
        assert (await select_provider(settings, lambda _: False, self._Fake())).name == "template"

    async def test_flag_and_key_select_anthropic_when_implemented(self) -> None:
        settings = Settings(anthropic_api_key="k")  # pyright: ignore[reportArgumentType]
        assert (await select_provider(settings, lambda _: True, self._Fake())).name == "anthropic"

    async def test_without_implementation_falls_back(self) -> None:
        settings = Settings(anthropic_api_key="k")  # pyright: ignore[reportArgumentType]
        assert (await select_provider(settings, lambda _: True)).name == "template"


def test_empty_env_values_fall_back_to_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    # Compose passes `ANTHROPIC_API_KEY=` when the key is unset; that must mean "no key".

    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    assert Settings().anthropic_api_key is None
