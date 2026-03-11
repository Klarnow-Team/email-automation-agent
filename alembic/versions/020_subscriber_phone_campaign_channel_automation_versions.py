"""Subscriber phone, campaign channel, automation versions

Revision ID: 020
Revises: 018
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "020"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("subscribers", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column(
        "campaigns",
        sa.Column("channel", sa.String(length=16), nullable=False, server_default=sa.text("'email'")),
    )
    op.create_table(
        "automation_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("automation_id", sa.Integer(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("trigger_type", sa.String(length=64), nullable=False),
        sa.Column("steps", JSONB(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["automation_id"], ["automations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_automation_versions_id"), "automation_versions", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_automation_versions_id"), table_name="automation_versions")
    op.drop_table("automation_versions")
    op.drop_column("campaigns", "channel")
    op.drop_column("subscribers", "phone")
