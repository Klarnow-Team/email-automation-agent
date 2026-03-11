"""Automation versions (rollback support)

Revision ID: 019
Revises: 018
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "automation_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("automation_id", sa.Integer(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trigger_type", sa.String(64), nullable=False),
        sa.Column("steps", JSONB(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["automation_id"], ["automations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_automation_versions_id"), "automation_versions", ["id"], unique=False)
    op.create_index(
        "ix_automation_versions_automation_id",
        "automation_versions",
        ["automation_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_automation_versions_automation_id", table_name="automation_versions")
    op.drop_index(op.f("ix_automation_versions_id"), table_name="automation_versions")
    op.drop_table("automation_versions")
