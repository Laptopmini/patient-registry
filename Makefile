.DEFAULT_GOAL := help
API := apps/api
WEB := apps/web

.PHONY: help install up down watch logs check lint typecheck test e2e fmt openapi

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-12s %s\n", $$1, $$2}'

install: ## Install all dependencies and git hooks
	cd $(API) && uv sync
	pnpm install

up: ## Start the full stack (docker compose)
	docker compose up --build -d

down: ## Stop the stack
	docker compose down

watch: ## Start the stack with hot reload
	docker compose watch

logs: ## Follow logs
	docker compose logs -f

fmt: ## Format everything
	cd $(API) && uv run ruff format . && uv run ruff check --fix .
	cd $(WEB) && pnpm format

lint: ## Lint both apps
	cd $(API) && uv run ruff check . && uv run ruff format --check .
	cd $(WEB) && pnpm lint

typecheck: ## Typecheck both apps
	cd $(API) && uv run pyright
	cd $(WEB) && pnpm typecheck

test: ## Unit and API tests for both apps
	cd $(API) && uv run pytest
	cd $(WEB) && pnpm test

check: lint typecheck test ## Lint, typecheck and test everything

openapi: ## Regenerate apps/api/openapi.json
	cd $(API) && uv run python -m app.export_openapi

e2e: ## Playwright e2e and axe checks (stack must be up)
	cd $(WEB) && pnpm e2e
