"""OpenFeature wiring. Flags default to off, and the app starts even if flagd is down."""

import asyncio

import structlog
from openfeature import api

from app.config import Settings

log = structlog.get_logger("app.flags")

SUMMARY_PROVIDER_ANTHROPIC = "summary-provider-anthropic"


def _set_flagd_provider(host: str, port: int) -> None:
    from openfeature.contrib.provider.flagd import FlagdProvider  # pyright: ignore[reportMissingTypeStubs]

    api.set_provider(FlagdProvider(host=host, port=port))


async def init_flags(settings: Settings) -> None:
    if not settings.flagd_host:
        return
    try:
        await asyncio.to_thread(_set_flagd_provider, settings.flagd_host, settings.flagd_port)
    except Exception as exc:
        log.warning("flagd_unavailable", error_type=type(exc).__name__)


async def shutdown_flags() -> None:
    try:
        await asyncio.to_thread(api.shutdown)
    except Exception as exc:
        log.warning("flags_shutdown_failed", error_type=type(exc).__name__)


def is_enabled(flag_key: str) -> bool:
    """Evaluate a boolean flag, defaulting to False on any failure."""
    try:
        return api.get_client().get_boolean_value(flag_key, False)
    except Exception:
        return False
