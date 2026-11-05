---
name: add-migration
description: Create and verify an Alembic migration after changing SQLAlchemy models in apps/api. Use whenever a table, column, index or constraint changes.
---

# Add a migration

1. Change the models in `apps/api/src/app/models/`.
2. Start a database (`docker compose up -d db`), then generate the migration: `cd apps/api && uv run alembic revision --autogenerate -m "<imperative summary>"`.
3. **Review the generated file by hand.** Autogenerate misses or mangles some things, so add these by hand:
   - extensions (`CREATE EXTENSION IF NOT EXISTS pg_trgm`)
   - GIN/trigram and partial indexes (`postgresql_where=`, `postgresql_using="gin"`, `postgresql_ops=`)
   - enum type creation and drop order
   - server defaults
4. Every migration needs a working `downgrade()`.
5. Verify the round trip: `uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head`.
6. Run `uv run pytest`. The test suite migrates a fresh database, so this proves the migration works on an empty schema.
7. Commit the model and migration together: `feat(api): …` or `chore(api): …`.
