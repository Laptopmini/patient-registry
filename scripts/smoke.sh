#!/usr/bin/env bash
# Smoke-test a running stack through the web entrypoint (Caddy).
set -euo pipefail
base="${1:-http://localhost:${WEB_PORT:-8080}}"
fail() { echo "FAIL: $*" >&2; exit 1; }

curl -fsS "$base/healthz" >/dev/null || fail "web /healthz"
[ "$(curl -fsS "$base/api/health")" = '{"status":"ok"}' ] || fail "api /health via proxy"
total=$(curl -fsS "$base/api/patients?limit=1" | python3 -c 'import json,sys; print(json.load(sys.stdin)["total"])')
[ "$total" -ge 15 ] || fail "expected a seeded database (>=15 patients), got $total"
curl -fsS "$base/patients/does-not-exist" | grep -q '<div id="root">' || fail "SPA fallback"
code=$(curl -s -o /dev/null -w '%{http_code}' "$base/api/patients/00000000-0000-4000-8000-000000000000")
[ "$code" = 404 ] || fail "unknown patient should be 404, got $code"
echo "OK: web, api proxy, seed ($total patients), SPA fallback, 404"
