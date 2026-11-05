import asyncio
from datetime import date, timedelta
from typing import Any

import pytest
from httpx import AsyncClient

from tests.api.helpers import MISSING_ID, add_note, assert_problem, create_patient, patient_body

VALIDATION = "/problems/validation-error"


class TestCreate:
    async def test_success(self, client: AsyncClient) -> None:
        response = await client.post("/patients", json=patient_body())
        assert response.status_code == 201
        body = response.json()
        assert response.headers["Location"] == f"/patients/{body['id']}"
        assert response.headers["ETag"] == '"1"'
        assert body["version"] == 1
        assert body["last_visit"] is None
        assert body["age"] >= 45
        assert body["phone"] == "+14155550155"
        assert body["address"]["country"] == "US"
        assert body["allergies"] == [{"name": "Penicillin"}]
        assert {"created_at", "updated_at"} <= body.keys()

    async def test_minimal_body_uses_defaults(self, client: AsyncClient) -> None:
        response = await client.post(
            "/patients",
            json={"first_name": "Bo", "last_name": "Min", "date_of_birth": "2001-02-03"},
        )
        body = response.json()
        assert response.status_code == 201
        assert (body["blood_type"], body["status"]) == ("unknown", "active")
        assert body["address"] is None
        assert body["email"] is None
        assert body["allergies"] == [] and body["conditions"] == []

    async def test_phone_is_normalized(self, client: AsyncClient) -> None:
        body = await create_patient(client, phone="+1 415-555-0155")
        assert body["phone"] == "+14155550155"

    async def test_list_order_is_preserved(self, client: AsyncClient) -> None:
        names = ["Zinc", "Aspirin", "Moss"]
        body = await create_patient(client, allergies=[{"name": n} for n in names])
        assert [a["name"] for a in body["allergies"]] == names

    @pytest.mark.parametrize(
        ("overrides", "field"),
        [
            ({"first_name": "   "}, "first_name"),
            ({"last_name": "x" * 101}, "last_name"),
            ({"date_of_birth": "2999-01-01"}, "date_of_birth"),
            ({"date_of_birth": "1850-01-01"}, "date_of_birth"),
            ({"email": "nope"}, "email"),
            ({"phone": "12345"}, "phone"),
            ({"address": {"line1": "x"}}, "address.city"),
            ({"address": {"line1": "x", "city": "y", "country": "usa"}}, "address.country"),
            ({"blood_type": "Z+"}, "blood_type"),
            ({"status": "archived"}, "status"),
            ({"allergies": [{"name": "A"}, {"name": "a"}]}, "allergies"),
            ({"conditions": [{"name": f"c{i}"} for i in range(51)]}, "conditions"),
            ({"conditions": [{"name": ""}]}, "conditions.0.name"),
        ],
    )
    async def test_validation_errors(
        self, client: AsyncClient, overrides: dict[str, Any], field: str
    ) -> None:
        response = await client.post("/patients", json=patient_body(**overrides))
        problem = assert_problem(response, 422, VALIDATION)
        fields = [e["field"] for e in problem["errors"]]
        assert any(f == field or f.startswith(field) for f in fields), fields
        assert all(e["message"] and e["type"] for e in problem["errors"])
        assert not any(f.startswith("body") for f in fields)

    async def test_missing_required_fields(self, client: AsyncClient) -> None:
        problem = assert_problem(await client.post("/patients", json={}), 422, VALIDATION)
        assert {e["field"] for e in problem["errors"]} == {
            "first_name",
            "last_name",
            "date_of_birth",
        }

    async def test_malformed_json(self, client: AsyncClient) -> None:
        response = await client.post(
            "/patients", content=b"{nope", headers={"Content-Type": "application/json"}
        )
        assert_problem(response, 422, VALIDATION)


class TestRead:
    async def test_get(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        response = await client.get(f"/patients/{created['id']}")
        assert response.status_code == 200
        assert response.headers["ETag"] == '"1"'
        assert response.json() == created

    async def test_not_found(self, client: AsyncClient) -> None:
        problem = assert_problem(await client.get(f"/patients/{MISSING_ID}"), 404)
        assert "not found" in problem["detail"].lower()

    async def test_bad_uuid(self, client: AsyncClient) -> None:
        problem = assert_problem(await client.get("/patients/not-a-uuid"), 422, VALIDATION)
        assert problem["errors"][0]["field"] == "patient_id"

    async def test_last_visit_follows_notes(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        pid = created["id"]
        old = await add_note(client, pid, when="2026-01-01T09:00:00Z")
        new = await add_note(client, pid, when="2026-02-01T09:00:00Z")
        got = (await client.get(f"/patients/{pid}")).json()
        assert got["last_visit"].startswith("2026-02-01T09:00:00")
        await client.delete(f"/patients/{pid}/notes/{new['id']}")
        got = (await client.get(f"/patients/{pid}")).json()
        assert got["last_visit"].startswith("2026-01-01T09:00:00")
        await client.delete(f"/patients/{pid}/notes/{old['id']}")
        assert (await client.get(f"/patients/{pid}")).json()["last_visit"] is None


class TestReplace:
    async def test_success_bumps_version_and_replaces_children(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        pid = created["id"]
        response = await client.put(
            f"/patients/{pid}",
            json=patient_body(
                first_name="Grace",
                address=None,
                phone=None,
                allergies=[],
                conditions=[{"name": "Eczema"}, {"name": "ADHD"}],
            ),
            headers={"If-Match": '"1"'},
        )
        assert response.status_code == 200
        assert response.headers["ETag"] == '"2"'
        body = response.json()
        assert body["version"] == 2
        assert body["first_name"] == "Grace"
        assert body["address"] is None and body["phone"] is None
        assert body["allergies"] == []
        assert [c["name"] for c in body["conditions"]] == ["Eczema", "ADHD"]
        assert body["updated_at"] >= created["updated_at"]
        assert body["created_at"] == created["created_at"]

    async def test_defaults_are_applied_on_put(self, client: AsyncClient) -> None:
        created = await create_patient(client, status="inactive", blood_type="B-")
        response = await client.put(
            f"/patients/{created['id']}",
            json={"first_name": "A", "last_name": "B", "date_of_birth": "1990-01-01"},
            headers={"If-Match": '"1"'},
        )
        assert (response.json()["status"], response.json()["blood_type"]) == ("active", "unknown")

    async def test_missing_if_match_is_428(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        response = await client.put(f"/patients/{created['id']}", json=patient_body())
        assert_problem(response, 428, "/problems/precondition-required")

    @pytest.mark.parametrize("header", ['"99"', '"abc"', "*", '""'])
    async def test_stale_or_bad_if_match_is_412(self, client: AsyncClient, header: str) -> None:
        created = await create_patient(client)
        response = await client.put(
            f"/patients/{created['id']}", json=patient_body(), headers={"If-Match": header}
        )
        assert_problem(response, 412, "/problems/precondition-failed")
        assert (await client.get(f"/patients/{created['id']}")).json()["version"] == 1

    async def test_second_put_with_old_etag_conflicts(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        url = f"/patients/{created['id']}"
        first = await client.put(url, json=patient_body(), headers={"If-Match": '"1"'})
        assert first.status_code == 200
        second = await client.put(url, json=patient_body(), headers={"If-Match": '"1"'})
        assert_problem(second, 412, "/problems/precondition-failed")
        third = await client.put(url, json=patient_body(), headers={"If-Match": '"2"'})
        assert third.status_code == 200

    async def test_concurrent_puts_only_one_wins(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        url = f"/patients/{created['id']}"
        results = await asyncio.gather(
            *(
                client.put(url, json=patient_body(first_name=f"N{i}"), headers={"If-Match": '"1"'})
                for i in range(5)
            )
        )
        assert sorted(r.status_code for r in results) == [200, 412, 412, 412, 412]

    async def test_not_found(self, client: AsyncClient) -> None:
        response = await client.put(
            f"/patients/{MISSING_ID}", json=patient_body(), headers={"If-Match": '"1"'}
        )
        assert_problem(response, 404)

    async def test_validation_error(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        response = await client.put(
            f"/patients/{created['id']}",
            json=patient_body(email="bad"),
            headers={"If-Match": '"1"'},
        )
        assert_problem(response, 422, VALIDATION)

    async def test_bad_uuid(self, client: AsyncClient) -> None:
        response = await client.put(
            "/patients/xyz", json=patient_body(), headers={"If-Match": '"1"'}
        )
        assert_problem(response, 422, VALIDATION)


class TestDelete:
    async def test_soft_delete_hides_the_patient_everywhere(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        pid = created["id"]
        note = await add_note(client, pid)

        response = await client.delete(f"/patients/{pid}")
        assert response.status_code == 204
        assert response.content == b""

        assert_problem(await client.get(f"/patients/{pid}"), 404)
        assert_problem(
            await client.put(f"/patients/{pid}", json=patient_body(), headers={"If-Match": '"1"'}),
            404,
        )
        assert_problem(await client.delete(f"/patients/{pid}"), 404)
        assert_problem(await client.get(f"/patients/{pid}/notes"), 404)
        assert_problem(
            await client.post(
                f"/patients/{pid}/notes",
                json={"recorded_at": "2026-01-01T00:00:00Z", "body": "x"},
            ),
            404,
        )
        assert_problem(await client.get(f"/patients/{pid}/notes/{note['id']}"), 404)
        assert_problem(await client.delete(f"/patients/{pid}/notes/{note['id']}"), 404)
        assert_problem(await client.get(f"/patients/{pid}/summary"), 404)
        listing = (await client.get("/patients")).json()
        assert listing["total"] == 0

    async def test_matching_if_match_succeeds(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        response = await client.delete(f"/patients/{created['id']}", headers={"If-Match": '"1"'})
        assert response.status_code == 204

    async def test_stale_if_match_is_412_and_keeps_the_patient(self, client: AsyncClient) -> None:
        created = await create_patient(client)
        response = await client.delete(f"/patients/{created['id']}", headers={"If-Match": '"7"'})
        assert_problem(response, 412, "/problems/precondition-failed")
        assert (await client.get(f"/patients/{created['id']}")).status_code == 200

    async def test_not_found_even_with_if_match(self, client: AsyncClient) -> None:
        response = await client.delete(f"/patients/{MISSING_ID}", headers={"If-Match": '"1"'})
        assert_problem(response, 404)

    async def test_bad_uuid(self, client: AsyncClient) -> None:
        assert_problem(await client.delete("/patients/xyz"), 422, VALIDATION)


async def test_age_uses_date_of_birth(client: AsyncClient) -> None:
    today = date.today()
    dob = today.replace(year=today.year - 10) - timedelta(days=1)
    body = await create_patient(client, date_of_birth=dob.isoformat())
    assert body["age"] == 10
