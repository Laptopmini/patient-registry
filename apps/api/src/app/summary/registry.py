import asyncio
from collections.abc import Callable

from app.config import Settings
from app.flags import SUMMARY_PROVIDER_ANTHROPIC, is_enabled
from app.summary.base import SummaryProvider
from app.summary.template import TemplateProvider

_template = TemplateProvider()


async def select_provider(
    settings: Settings,
    flag_check: Callable[[str], bool] = is_enabled,
    anthropic: SummaryProvider | None = None,
) -> SummaryProvider:
    """Pick the summary provider.

    The anthropic provider is used only when the flag is on, an API key is set and an
    implementation is supplied. Stage 2 supplies none, so it always falls back to the
    template provider; the seam is here for Stage 6.
    """
    # Flag evaluation can block on the network, so keep it off the event loop.
    if (
        anthropic is not None
        and settings.anthropic_api_key is not None
        and await asyncio.to_thread(flag_check, SUMMARY_PROVIDER_ANTHROPIC)
    ):
        return anthropic
    return _template
