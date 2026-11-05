"""Write the live OpenAPI schema to `apps/api/openapi.json`."""

import json
from pathlib import Path
from typing import Any

from app.main import create_app

OPENAPI_PATH = Path(__file__).resolve().parents[2] / "openapi.json"


def render_schema() -> str:
    schema: dict[str, Any] = create_app().openapi()
    return json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def main() -> None:
    OPENAPI_PATH.write_text(render_schema(), encoding="utf-8")


if __name__ == "__main__":
    main()
