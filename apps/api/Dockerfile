# syntax=docker/dockerfile:1

# ---- builder: resolve and install locked, non-dev dependencies into /app/.venv ----
FROM python:3.14-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.11.19 /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app

# Dependencies first, so this layer is cached until the lockfile changes.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-dev --no-install-project

COPY pyproject.toml uv.lock README.md ./
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

# ---- runtime: venv, source and migrations only, as a non-root user ----
FROM python:3.14-slim AS runtime
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=builder --chown=10001:10001 /app/.venv /app/.venv
COPY --chown=10001:10001 src ./src
COPY --chown=10001:10001 migrations ./migrations
COPY --chown=10001:10001 alembic.ini ./
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).status == 200 else 1)"]
# --no-access-log: uvicorn's access log prints query strings, and search terms can be names.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--no-access-log"]

# ---- dev: dev dependencies, editable install, auto-reload (mount ./src and ./migrations) ----
FROM python:3.14-slim AS dev
COPY --from=ghcr.io/astral-sh/uv:0.11.19 /uv /uvx /bin/
ENV UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin app
WORKDIR /app
RUN chown 10001:10001 /app
USER 10001:10001
COPY --chown=10001:10001 pyproject.toml uv.lock README.md alembic.ini ./
COPY --chown=10001:10001 src ./src
COPY --chown=10001:10001 migrations ./migrations
RUN --mount=type=cache,target=/home/app/.cache/uv,uid=10001,gid=10001 uv sync --locked
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--no-access-log", "--reload", "--reload-dir", "src"]
