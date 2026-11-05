# 0010. Caddy serves the web app and proxies the API

- Status: accepted
- Date: 2026-11-05

## Context
The web client needs a production-like container. Development uses `docker compose watch` for hot reload.

## Options
- **Caddy serving the Vite build**: a separate service with a reverse proxy.
- **nginx serving the Vite build**: similar, with more configuration.
- **FastAPI serving the static files**: one fewer container, but it ties frontend deploys to the API.

## Decision
A multi-stage web Dockerfile: Node builds the app, and Caddy serves it. Caddy proxies `/api/*` to the API (and the flagd endpoints), with SPA fallback, compression and cache headers. A `dev` target runs the Vite dev server for `compose watch`.

## Consequences
- The browser sees one origin, so there's no CORS setup.
- The Caddyfile is short and readable. Immutable caching for hashed assets helps Lighthouse.
- One more image to build. The API never serves the UI.
