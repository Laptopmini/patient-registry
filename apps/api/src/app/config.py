"""Application settings, read from environment variables. Every setting has a default."""

from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", env_ignore_empty=True)

    database_url: str = "postgresql+asyncpg://registry:registry@localhost:5432/registry"
    seed_on_startup: bool = True
    seed_patients: int = Field(default=20, ge=0)
    seed_value: int = 20261105
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "json"
    flagd_host: str | None = None
    flagd_port: int = 8013
    # Wired only: the anthropic summary provider arrives in a later stage.
    anthropic_api_key: SecretStr | None = None
