"""Subscriber: add bounced/suppressed status and consent metadata

Revision ID: 003
Revises: 002
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL: add new enum values (idempotent; duplicate_object is ignored)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE subscriberstatus ADD VALUE 'bounced';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE subscriberstatus ADD VALUE 'suppressed';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.add_column("subscribers", sa.Column("consent_ip", sa.String(45), nullable=True))
    op.add_column("subscribers", sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("subscribers", sa.Column("source_form_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("subscribers", "source_form_id")
    op.drop_column("subscribers", "consented_at")
    op.drop_column("subscribers", "consent_ip")
    # Enum values cannot be removed in PostgreSQL without recreating the type and column
