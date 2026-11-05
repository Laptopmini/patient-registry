from typing import Any

import pytest
from httpx import AsyncClient

from tests.api.helpers import add_note, assert_problem, create_patient

ITEM_KEYS = {
    "id",
    "first_name",
    "last_name",
    "date_of_birth",
    "age",
    "status",
    "blood_type",
    "last_visit",
}


@pytest.fixture
async def roster(client: AsyncClient) -> dict[str, dict[str, Any]]:
    people = {
        "ada": dict(first_name="Ada", last_name="Zimmer", date_of_birth="1950-01-01",
                    email="ada@example.com", phone="+14155550101", status="active",
                    blood_type="A+", allergies=[{"name": "Latex"}],
                    conditions=[{"name": "Hypertension"}]),
        "bob": dict(first_name="Bob", last_name="alpha", date_of_birth="1990-06-15",
                    email="bob.alpha@example.com", phone="+12125550102", status="follow_up",
                    blood_type="O-", allergies=[], conditions=[{"name": "Asthma"}]),
        "cy": dict(first_name="Cy", last_name="Mills", date_of_birth="2015-03-03",
                   email=None, phone=None, status="inactive", blood_type="A+",
                   allergies=[{"name": "Peanuts"}, {"name": "latex"}], conditions=[]),
        "dee": dict(first_name="Dee", last_name="Mills", date_of_birth="2001-09-09",
                    email="dee_100%@example.com", phone="+13125550103", status="active",
                    blood_type="unknown", allergies=[], conditions=[]),
    }  # fmt: skip
    created = {k: await create_patient(client, address=None, **v) for k, v in people.items()}
    await add_note(client, created["ada"]["id"], when="2026-01-10T00:00:00Z")
    await add_note(client, created["bob"]["id"], when="2026-03-10T00:00:00Z")
    await add_note(client, created["bob"]["id"], when="2026-02-10T00:00:00Z")
    return created


async def _names(client: AsyncClient, **params: Any) -> list[str]:
    response = await client.get("/patients", params=params)
    assert response.status_code == 200, response.text
    return [i["first_name"] for i in response.json()["items"]]


async def test_empty_list_shape(client: AsyncClient) -> None:
    response = await client.get("/patients")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}


async def test_item_shape_and_defaults(client: AsyncClient, roster: dict[str, Any]) -> None:
    body = (await client.get("/patients")).json()
    assert body["total"] == 4
    assert set(body["items"][0]) == ITEM_KEYS
    # Default sort is last_name, case-insensitive: alpha, Mills (Cy, Dee), Zimmer.
    assert [i["first_name"] for i in body["items"]] == ["Bob", "Cy", "Dee", "Ada"]


class TestSort:
    @pytest.mark.parametrize(
        ("sort", "expected"),
        [
            ("last_name", ["Bob", "Cy", "Dee", "Ada"]),
            ("-last_name", ["Ada", "Dee", "Cy", "Bob"]),
            ("first_name", ["Ada", "Bob", "Cy", "Dee"]),
            ("-first_name", ["Dee", "Cy", "Bob", "Ada"]),
            ("age", ["Cy", "Dee", "Bob", "Ada"]),
            ("-age", ["Ada", "Bob", "Dee", "Cy"]),
            ("last_visit", ["Ada", "Bob", "Cy", "Dee"]),
            ("-last_visit", ["Bob", "Ada", "Cy", "Dee"]),
            ("created_at", ["Ada", "Bob", "Cy", "Dee"]),
            ("-created_at", ["Dee", "Cy", "Bob", "Ada"]),
        ],
    )
    async def test_sort_values(
        self, client: AsyncClient, roster: dict[str, Any], sort: str, expected: list[str]
    ) -> None:
        names = await _names(client, sort=sort)
        if sort.endswith("last_visit"):
            # Patients without notes always come last; their relative order falls back to id.
            assert names[:2] == expected[:2]
            assert set(names[2:]) == {"Cy", "Dee"}
        else:
            assert names == expected

    @pytest.mark.parametrize("sort", ["email", "-email", "last_name,age", "", "id"])
    async def test_unknown_sort_is_422(self, client: AsyncClient, sort: str) -> None:
        problem = assert_problem(
            await client.get("/patients", params={"sort": sort}), 422, "/problems/validation-error"
        )
        assert problem["errors"][0]["field"] == "sort"


class TestFilters:
    async def test_status(self, client: AsyncClient, roster: dict[str, Any]) -> None:
        assert await _names(client, status="active", sort="first_name") == ["Ada", "Dee"]
        assert await _names(client, status="inactive") == ["Cy"]

    async def test_blood_type(self, client: AsyncClient, roster: dict[str, Any]) -> None:
        assert await _names(client, blood_type="A+", sort="first_name") == ["Ada", "Cy"]
        assert await _names(client, blood_type="O-") == ["Bob"]

    async def test_condition_and_allergy_are_case_insensitive_exact(
        self, client: AsyncClient, roster: dict[str, Any]
    ) -> None:
        assert await _names(client, condition="hypertension") == ["Ada"]
        assert await _names(client, condition="Hyper") == []
        assert await _names(client, allergy="LATEX", sort="first_name") == ["Ada", "Cy"]
        assert await _names(client, allergy="peanuts") == ["Cy"]

    async def test_combined(self, client: AsyncClient, roster: dict[str, Any]) -> None:
        assert await _names(client, status="active", blood_type="A+", allergy="latex") == ["Ada"]
        assert await _names(client, status="inactive", blood_type="O-") == []

    @pytest.mark.parametrize("params", [{"status": "gone"}, {"blood_type": "X"}])
    async def test_invalid_enum_filter_is_422(
        self, client: AsyncClient, params: dict[str, str]
    ) -> None:
        assert_problem(
            await client.get("/patients", params=params), 422, "/problems/validation-error"
        )


class TestSearch:
    async def test_matches_name_email_phone_case_insensitive(
        self, client: AsyncClient, roster: dict[str, Any]
    ) -> None:
        assert await _names(client, q="ZIMM") == ["Ada"]
        assert await _names(client, q="ada zimmer") == ["Ada"]  # across first and last name
        assert await _names(client, q="bob.alpha@") == ["Bob"]
        assert await _names(client, q="555 0103") == []
        assert await _names(client, q="5550103") == ["Dee"]

    async def test_like_wildcards_are_escaped(
        self, client: AsyncClient, roster: dict[str, Any]
    ) -> None:
        assert await _names(client, q="%") == ["Dee"]  # only the literal percent sign matches
        assert await _names(client, q="_") == ["Dee"]
        assert await _names(client, q="\\") == []

    async def test_blank_search_returns_everything(
        self, client: AsyncClient, roster: dict[str, Any]
    ) -> None:
        assert len(await _names(client, q="   ")) == 4

    async def test_search_combines_with_filter_and_total(
        self, client: AsyncClient, roster: dict[str, Any]
    ) -> None:
        body = (await client.get("/patients", params={"q": "mills", "status": "active"})).json()
        assert [i["first_name"] for i in body["items"]] == ["Dee"]
        assert body["total"] == 1

    async def test_too_long_query_is_422(self, client: AsyncClient) -> None:
        response = await client.get("/patients", params={"q": "x" * 101})
        assert_problem(response, 422, "/problems/validation-error")


class TestPagination:
    async def test_limit_offset_and_total(
        self, client: AsyncClient, roster: dict[str, Any]
    ) -> None:
        page1 = (await client.get("/patients", params={"limit": 3, "sort": "first_name"})).json()
        page2 = (
            await client.get("/patients", params={"limit": 3, "offset": 3, "sort": "first_name"})
        ).json()
        assert [i["first_name"] for i in page1["items"]] == ["Ada", "Bob", "Cy"]
        assert [i["first_name"] for i in page2["items"]] == ["Dee"]
        assert (page1["total"], page2["total"]) == (4, 4)
        assert (page2["limit"], page2["offset"]) == (3, 3)

    async def test_offset_past_the_end(self, client: AsyncClient, roster: dict[str, Any]) -> None:
        body = (await client.get("/patients", params={"offset": 50})).json()
        assert body["items"] == [] and body["total"] == 4

    async def test_ties_are_stable_across_pages(self, client: AsyncClient) -> None:
        for i in range(6):
            await create_patient(client, first_name=f"P{i}", last_name="Same")
        seen: list[str] = []
        for offset in range(0, 6, 2):
            page = (await client.get("/patients", params={"limit": 2, "offset": offset})).json()
            seen += [i["id"] for i in page["items"]]
        assert len(set(seen)) == 6

    @pytest.mark.parametrize(
        "params", [{"limit": 0}, {"limit": 101}, {"offset": -1}, {"limit": "x"}]
    )
    async def test_invalid_paging_is_422(self, client: AsyncClient, params: dict[str, Any]) -> None:
        assert_problem(
            await client.get("/patients", params=params), 422, "/problems/validation-error"
        )
