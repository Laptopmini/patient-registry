# syntax=docker/dockerfile:1
# Build context: the repository root (the pnpm workspace and lockfile live there).

FROM node:24-alpine AS deps
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true LEFTHOOK=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter @patient-registry/web

# ---- dev: Vite dev server with HMR (used by `docker compose watch`) ----
FROM deps AS dev
COPY apps/web apps/web
WORKDIR /repo/apps/web
EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:5173/ || exit 1
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]

# ---- build: typecheck and bundle ----
FROM deps AS build
COPY apps/web apps/web
RUN pnpm --filter @patient-registry/web build

# ---- runtime: Caddy serves the static build and proxies /api, as a non-root user ----
FROM caddy:2.11-alpine AS runtime
RUN addgroup -S -g 10001 web && adduser -S -u 10001 -G web web \
 && mkdir -p /data /config && chown -R web:web /data /config
COPY apps/web/docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv
USER web
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
