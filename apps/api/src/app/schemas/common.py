"""Shared schemas, including the RFC 9457 problem-details models."""

from typing import Annotated

from pydantic import BaseModel, StringConstraints

Name100 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class Problem(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None


class FieldError(BaseModel):
    field: str
    message: str
    type: str


class ValidationProblem(Problem):
    errors: list[FieldError]
