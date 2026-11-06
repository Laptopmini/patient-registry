"""Eval case loading and validation."""

import json
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, ValidationError

CASES_FILE = Path(__file__).with_name("cases.jsonl")


class CaseNote(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recorded_at: datetime
    body: str = Field(min_length=1)


class Case(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    notes: list[CaseNote] = Field(min_length=1)
    tags: list[str] = []


def load_cases(path: Path = CASES_FILE) -> list[Case]:
    cases: list[Case] = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            cases.append(Case.model_validate(json.loads(line)))
        except (ValueError, ValidationError) as exc:
            # Report the line only; case bodies are not echoed.
            raise ValueError(f"{path.name}:{lineno}: invalid case ({type(exc).__name__})") from exc
    ids = [c.id for c in cases]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate case ids")
    return cases
