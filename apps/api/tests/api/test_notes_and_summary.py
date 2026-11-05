from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

from tests.api.helpers import MISSING_ID, add_note, assert_problem, create_patient, hours_ago

VALIDATION = "/problems/validation-error"


class TestCreateNote:
    async def test_success(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        response = await client.post(
            f"/patients/{patient['id']}/notes",
            json={"recorded_at": "2026-02-01T10:30:00+02:00", "body": "  Check-up done.  "},
        )
        assert response.status_code == 201
        note = response.json()
        assert response.headers["Location"] == f"/patients/{patient['id']}/notes/{note['id']}"
        assert note["body"] == "Check-up done."
        assert note["patient_id"] == patient["id"]
        assert datetime.fromisoformat(note["recorded_at"]) == datetime(
            2026, 2, 1, 8, 30, tzinfo=UTC
        )
        assert note["created_at"]

    async def test_small_clock_skew_is_allowed(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        soon = (datetime.now(UTC) + timedelta(seconds=30)).isoformat()
        response = await client.post(
            f"/patients/{patient['id']}/notes", json={"recorded_at": soon, "body": "x"}
        )
        assert response.status_code == 201

    @pytest.mark.parametrize(
        ("payload", "field"),
        [
            ({"recorded_at": "2026-02-01T10:30:00", "body": "x"}, "recorded_at"),
            ({"recorded_at": "not a date", "body": "x"}, "recorded_at"),
            ({"recorded_at": "2999-01-01T00:00:00Z", "body": "x"}, "recorded_at"),
            ({"recorded_at": "2026-02-01T10:30:00Z", "body": "   "}, "body"),
            ({"recorded_at": "2026-02-01T10:30:00Z", "body": "x" * 5001}, "body"),
            ({"recorded_at": "2026-02-01T10:30:00Z"}, "body"),
            ({"body": "x"}, "recorded_at"),
        ],
    )
    async def test_validation_errors(
        self, client: AsyncClient, payload: dict[str, str], field: str
    ) -> None:
        patient = await create_patient(client)
        response = await client.post(f"/patients/{patient['id']}/notes", json=payload)
        problem = assert_problem(response, 422, VALIDATION)
        assert field in [e["field"] for e in problem["errors"]]

    async def test_max_length_body_accepted(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        response = await client.post(
            f"/patients/{patient['id']}/notes",
            json={"recorded_at": hours_ago(1), "body": "x" * 5000},
        )
        assert response.status_code == 201

    async def test_unknown_patient(self, client: AsyncClient) -> None:
        response = await client.post(
            f"/patients/{MISSING_ID}/notes", json={"recorded_at": hours_ago(1), "body": "x"}
        )
        assert_problem(response, 404)

    async def test_bad_patient_uuid(self, client: AsyncClient) -> None:
        response = await client.post(
            "/patients/xyz/notes", json={"recorded_at": hours_ago(1), "body": "x"}
        )
        assert_problem(response, 422, VALIDATION)


class TestListNotes:
    async def test_newest_first_and_empty(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        pid = patient["id"]
        assert (await client.get(f"/patients/{pid}/notes")).json() == {"items": []}
        await add_note(client, pid, "middle", "2026-02-01T00:00:00Z")
        await add_note(client, pid, "oldest", "2026-01-01T00:00:00Z")
        await add_note(client, pid, "newest", "2026-03-01T00:00:00Z")
        items = (await client.get(f"/patients/{pid}/notes")).json()["items"]
        assert [n["body"] for n in items] == ["newest", "middle", "oldest"]

    async def test_only_the_patients_own_notes(self, client: AsyncClient) -> None:
        a = await create_patient(client)
        b = await create_patient(client, first_name="Other")
        await add_note(client, a["id"], "mine")
        await add_note(client, b["id"], "theirs")
        items = (await client.get(f"/patients/{a['id']}/notes")).json()["items"]
        assert [n["body"] for n in items] == ["mine"]

    async def test_not_found(self, client: AsyncClient) -> None:
        assert_problem(await client.get(f"/patients/{MISSING_ID}/notes"), 404)
        assert_problem(await client.get("/patients/xyz/notes"), 422, VALIDATION)


class TestGetAndDeleteNote:
    async def test_get(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        note = await add_note(client, patient["id"])
        response = await client.get(f"/patients/{patient['id']}/notes/{note['id']}")
        assert response.status_code == 200
        assert response.json() == note

    async def test_delete(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        note = await add_note(client, patient["id"])
        url = f"/patients/{patient['id']}/notes/{note['id']}"
        response = await client.delete(url)
        assert response.status_code == 204
        assert response.content == b""
        assert_problem(await client.get(url), 404)
        assert_problem(await client.delete(url), 404)

    async def test_note_of_another_patient_is_404(self, client: AsyncClient) -> None:
        a = await create_patient(client)
        b = await create_patient(client, first_name="Other")
        note = await add_note(client, a["id"])
        url = f"/patients/{b['id']}/notes/{note['id']}"
        assert_problem(await client.get(url), 404)
        assert_problem(await client.delete(url), 404)
        # The note is untouched.
        assert (await client.get(f"/patients/{a['id']}/notes/{note['id']}")).status_code == 200

    async def test_unknown_patient_or_note(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        assert_problem(await client.get(f"/patients/{patient['id']}/notes/{MISSING_ID}"), 404)
        assert_problem(await client.delete(f"/patients/{patient['id']}/notes/{MISSING_ID}"), 404)
        assert_problem(await client.get(f"/patients/{MISSING_ID}/notes/{MISSING_ID}"), 404)
        assert_problem(await client.delete(f"/patients/{MISSING_ID}/notes/{MISSING_ID}"), 404)

    async def test_bad_uuids(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        assert_problem(await client.get(f"/patients/{patient['id']}/notes/xyz"), 422, VALIDATION)
        assert_problem(await client.delete(f"/patients/{patient['id']}/notes/xyz"), 422, VALIDATION)


class TestSummary:
    async def test_shape_with_notes(self, client: AsyncClient) -> None:
        patient = await create_patient(
            client,
            blood_type="AB+",
            allergies=[{"name": "Latex"}],
            conditions=[{"name": "Asthma"}, {"name": "Eczema"}],
        )
        pid = patient["id"]
        await add_note(client, pid, "Wheezing noted. Inhaler refilled.", "2026-01-05T09:00:00Z")
        await add_note(client, pid, "Follow-up visit. Breathing improved.", "2026-02-05T09:00:00Z")
        response = await client.get(f"/patients/{pid}/summary")
        assert response.status_code == 200
        body = response.json()
        assert set(body) == {
            "patient_id", "name", "age", "blood_type", "conditions", "allergies",
            "narrative", "provider", "note_count", "generated_at",
        }  # fmt: skip
        assert body["patient_id"] == pid
        assert body["name"] == "Ada Testington"
        assert body["age"] == patient["age"]
        assert body["blood_type"] == "AB+"
        assert body["conditions"] == ["Asthma", "Eczema"]
        assert body["allergies"] == ["Latex"]
        assert body["provider"] == "template"
        assert body["note_count"] == 2
        assert "Based on 2 notes recorded between 5 Jan 2026 and 5 Feb 2026." in body["narrative"]
        assert "Follow-up visit." in body["narrative"]
        # The narrative is built from notes only, never from identifiers.
        assert "Ada" not in body["narrative"] and "Testington" not in body["narrative"]

    async def test_without_notes(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        body = (await client.get(f"/patients/{patient['id']}/summary")).json()
        assert body["note_count"] == 0
        assert "No clinical notes" in body["narrative"]

    async def test_cache_reuses_until_notes_change(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        pid = patient["id"]
        await add_note(client, pid, "First.")
        first = (await client.get(f"/patients/{pid}/summary")).json()
        again = (await client.get(f"/patients/{pid}/summary")).json()
        assert again["generated_at"] == first["generated_at"]
        await add_note(client, pid, "Second.", hours_ago(1))
        changed = (await client.get(f"/patients/{pid}/summary")).json()
        assert changed["note_count"] == 2
        assert changed["narrative"] != first["narrative"]

    async def test_facts_stay_fresh_when_the_narrative_is_cached(self, client: AsyncClient) -> None:
        patient = await create_patient(client)
        pid = patient["id"]
        await add_note(client, pid, "Visit.")
        await client.get(f"/patients/{pid}/summary")
        await client.put(
            f"/patients/{pid}",
            json={**patient, "conditions": [{"name": "Gout"}], "first_name": "Renamed"},
            headers={"If-Match": '"1"'},
        )
        body = (await client.get(f"/patients/{pid}/summary")).json()
        assert body["conditions"] == ["Gout"]
        assert body["name"].startswith("Renamed")

    async def test_not_found(self, client: AsyncClient) -> None:
        assert_problem(await client.get(f"/patients/{MISSING_ID}/summary"), 404)
        assert_problem(await client.get("/patients/xyz/summary"), 422, VALIDATION)
