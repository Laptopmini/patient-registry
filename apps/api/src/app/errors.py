"""RFC 9457 problem-details responses and the exception handlers that produce them."""

from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.common import Problem, ValidationProblem
from app.services.errors import NotFoundError, VersionMismatchError

PROBLEM_JSON = "application/problem+json"
VALIDATION_TYPE = "/problems/validation-error"
PRECONDITION_FAILED_TYPE = "/problems/precondition-failed"
PRECONDITION_REQUIRED_TYPE = "/problems/precondition-required"


class PreconditionRequiredError(Exception):
    """A conditional request header (If-Match) is required but missing."""


def problem_response(
    status: int,
    detail: str | None = None,
    *,
    type_: str = "about:blank",
    headers: dict[str, str] | None = None,
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": type_,
        "title": HTTPStatus(status).phrase,
        "status": status,
        "detail": detail,
    }
    if extra:
        body.update(extra)
    return JSONResponse(body, status_code=status, media_type=PROBLEM_JSON, headers=headers)


def _field_path(loc: tuple[Any, ...]) -> str:
    parts = [str(p) for p in loc]
    if parts and parts[0] in {"body", "query", "path", "header"}:
        parts = parts[1:]
    return ".".join(parts)


def _message(raw: str) -> str:
    return raw.removeprefix("Value error, ")


async def _http_exception(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    detail = exc.detail or None
    return problem_response(exc.status_code, detail, headers=dict(exc.headers or {}))


async def _validation_exception(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    errors = [
        {"field": _field_path(tuple(e["loc"])), "message": _message(e["msg"]), "type": e["type"]}
        for e in exc.errors()
    ]
    return problem_response(
        422,
        "The request is invalid. See errors for details.",
        type_=VALIDATION_TYPE,
        extra={"errors": errors},
    )


async def _not_found(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, NotFoundError)
    return problem_response(404, f"{exc.resource} not found.")


async def _version_mismatch(_: Request, __: Exception) -> JSONResponse:
    return problem_response(
        412,
        "The record was changed since you loaded it. Reload and try again.",
        type_=PRECONDITION_FAILED_TYPE,
    )


async def _precondition_required(_: Request, __: Exception) -> JSONResponse:
    return problem_response(
        428,
        "An If-Match header with the current ETag is required.",
        type_=PRECONDITION_REQUIRED_TYPE,
    )


async def _unhandled(_: Request, __: Exception) -> JSONResponse:
    return problem_response(500, "An unexpected error occurred.")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, _http_exception)
    app.add_exception_handler(RequestValidationError, _validation_exception)
    app.add_exception_handler(NotFoundError, _not_found)
    app.add_exception_handler(VersionMismatchError, _version_mismatch)
    app.add_exception_handler(PreconditionRequiredError, _precondition_required)
    app.add_exception_handler(Exception, _unhandled)


def problem_responses(*codes: int) -> dict[int | str, dict[str, Any]]:
    """OpenAPI `responses=` entries for error statuses, using the shared Problem models."""
    out: dict[int | str, dict[str, Any]] = {}
    for code in codes:
        model = ValidationProblem if code == 422 else Problem
        out[code] = {"model": model, "description": HTTPStatus(code).phrase}
    return out
