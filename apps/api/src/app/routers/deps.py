from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def etag_for(version: int) -> str:
    return f'"{version}"'


def parse_if_match(value: str) -> int | None:
    """Return the version named by an If-Match header, or None if it cannot match any version."""
    token = value.strip().removeprefix("W/").strip('"')
    return int(token) if token.isascii() and token.isdigit() else None
