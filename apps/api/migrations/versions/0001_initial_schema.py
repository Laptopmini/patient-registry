"""Initial schema: patients, allergies, conditions, notes.

Revision ID: 0001
Revises:
Create Date: 2026-11-05

`last_visit` is deliberately not a column (ADR 0001); it is derived from notes.
Patients are soft-deleted (ADR 0003), so every search index is partial on
`archived_at IS NULL`.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BLOOD_TYPES = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown")
STATUSES = ("active", "follow_up", "inactive")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    blood_type = postgresql.ENUM(*BLOOD_TYPES, name="blood_type", create_type=False)
    status = postgresql.ENUM(*STATUSES, name="patient_status", create_type=False)
    blood_type.create(op.get_bind(), checkfirst=True)
    status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "patients",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(20)),
        sa.Column("address_line1", sa.String(200)),
        sa.Column("address_line2", sa.String(200)),
        sa.Column("address_city", sa.String(100)),
        sa.Column("address_region", sa.String(100)),
        sa.Column("address_postal_code", sa.String(20)),
        sa.Column("address_country", sa.CHAR(2)),
        sa.Column("blood_type", blood_type, nullable=False, server_default="unknown"),
        sa.Column("status", status, nullable=False, server_default="active"),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
    )

    for table in ("patient_allergies", "patient_conditions"):
        op.create_table(
            table,
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column(
                "patient_id",
                sa.Uuid(),
                sa.ForeignKey("patients.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False),
        )
        op.execute(
            f"CREATE UNIQUE INDEX uq_{table}_patient_lower_name "
            f"ON {table} (patient_id, lower(name))"
        )

    op.create_table(
        "notes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "patient_id",
            sa.Uuid(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.execute("CREATE INDEX ix_notes_patient_recorded ON notes (patient_id, recorded_at DESC)")

    live = "WHERE archived_at IS NULL"
    op.execute(
        "CREATE INDEX ix_patients_full_name_trgm ON patients "
        f"USING gin ((first_name || ' ' || last_name) gin_trgm_ops) {live}"
    )
    op.execute(
        f"CREATE INDEX ix_patients_email_trgm ON patients USING gin (email gin_trgm_ops) {live}"
    )
    op.execute(
        f"CREATE INDEX ix_patients_phone_trgm ON patients USING gin (phone gin_trgm_ops) {live}"
    )
    op.execute(
        "CREATE INDEX ix_patients_name_sort ON patients "
        f"(lower(last_name), lower(first_name), id) {live}"
    )
    op.execute(f"CREATE INDEX ix_patients_date_of_birth ON patients (date_of_birth) {live}")
    op.execute(f"CREATE INDEX ix_patients_status ON patients (status) {live}")
    op.execute(f"CREATE INDEX ix_patients_created_at ON patients (created_at) {live}")


def downgrade() -> None:
    op.drop_table("notes")
    op.drop_table("patient_conditions")
    op.drop_table("patient_allergies")
    op.drop_table("patients")
    op.execute("DROP TYPE patient_status")
    op.execute("DROP TYPE blood_type")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
