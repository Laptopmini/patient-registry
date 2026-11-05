"""structlog setup and the request-logging ASGI middleware.

Logs never contain request bodies, query strings or patient fields.
"""

import logging
import re
import sys
import time
import uuid
from typing import Literal

import structlog
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"
_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")

log = structlog.get_logger("app")


def configure_logging(level: str = "INFO", fmt: Literal["json", "console"] = "json") -> None:
    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if fmt == "json"
        else structlog.dev.ConsoleRenderer(colors=False)
    )
    shared: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]
    numeric_level = logging.getLevelNamesMapping().get(level.upper(), logging.INFO)
    structlog.configure(
        processors=[*shared, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(numeric_level),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=False,
    )
    # Uvicorn's access log prints the query string, and search terms can be names.
    access = logging.getLogger("uvicorn.access")
    access.handlers.clear()
    access.propagate = False
    access.disabled = True


PROBLEM_500_BODY = (
    b'{"type":"about:blank","title":"Internal Server Error","status":500,'
    b'"detail":"An unexpected error occurred."}'
)


class RequestLoggingMiddleware:
    """Pure ASGI middleware: request id, one `request` log event, and a safe 500 body."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = Headers(scope=scope).get(REQUEST_ID_HEADER)
        request_id = (
            incoming if incoming and _VALID_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        )
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        status = 500
        started = False
        start = time.perf_counter()

        async def send_wrapper(message: Message) -> None:
            nonlocal status, started
            if message["type"] == "http.response.start":
                started = True
                status = int(message["status"])
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            # Log the exception type only: messages can embed patient data.
            log.error("unhandled_exception", error_type=type(exc).__name__, request_id=request_id)
            if started:
                raise
            await send_wrapper(
                {
                    "type": "http.response.start",
                    "status": 500,
                    "headers": [
                        (b"content-type", b"application/problem+json"),
                        (b"content-length", str(len(PROBLEM_500_BODY)).encode()),
                    ],
                }
            )
            await send_wrapper({"type": "http.response.body", "body": PROBLEM_500_BODY})
        finally:
            log.info(
                "request",
                method=scope["method"],
                path=scope["path"],
                status=status,
                duration_ms=round((time.perf_counter() - start) * 1000, 2),
                request_id=request_id,
            )
            structlog.contextvars.clear_contextvars()
