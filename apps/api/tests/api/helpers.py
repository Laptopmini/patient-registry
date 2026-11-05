from datetime import UTC, datetime, timedelta
from typing import Any

from httpx import AsyncClient, Response

PROBLEM = "application/problem+json"
MISSING_ID = "00000000-0000-4000-8000-000000000000"


def patient_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "first_name": "Ada",
        "last_name": "Testington",
        "date_of_birth": "1980-05-01",
        "email": "ada.testington@example.com",
        "phone": "+14155550155",
        "address": {"line1": "1 Synthetic Way", "city": "Faketown", "region": "CA"},
        "blood_type": "O+",
        "status": "active",
        "allergies": [{"name": "Penicillin"}],
        "conditions": [{"name": "Asthma"}],
    }
    body.update(overrides)
    return body


async def create_patient(client: AsyncClient, **overrides: Any) -> dict[str, Any]:
    response = await client.post("/patients", json=patient_body(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


def hours_ago(hours: float) -> str:
    return (datetime.now(UTC) - timedelta(hours=hours)).isoformat()


async def add_note(
    client: AsyncClient, patient_id: str, body: str = "Routine visit.", when: str | None = None
) -> dict[str, Any]:
    response = await client.post(
        f"/patients/{patient_id}/notes",
        json={"recorded_at": when or hours_ago(2), "body": body},
    )
    assert response.status_code == 201, response.text
    return response.json()


def assert_problem(response: Response, status: int, type_: str = "about:blank") -> dict[str, Any]:
    assert response.status_code == status, response.text
    assert response.headers["content-type"].startswith(PROBLEM)
    assert "X-Request-ID" in response.headers
    body = response.json()
    assert body["status"] == status
    assert body["type"] == type_
    assert body["title"]
    return body
