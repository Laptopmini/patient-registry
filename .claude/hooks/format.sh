#!/usr/bin/env bash
# PostToolUse hook: format the file Claude just edited. Never blocks the edit.
set -u
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] || [ ! -f "$file" ] && exit 0
root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
case "$file" in
  "$root"/apps/api/*.py)
    (cd "$root/apps/api" && uv run --quiet ruff format "$file" && uv run --quiet ruff check --fix --quiet "$file") >/dev/null 2>&1 ;;
  "$root"/apps/web/*.ts|"$root"/apps/web/*.tsx|"$root"/apps/web/*.css|"$root"/apps/web/*.json)
    (cd "$root/apps/web" && pnpm exec biome check --write --no-errors-on-unmatched "$file") >/dev/null 2>&1 ;;
esac
exit 0
