"""Subscriber field definitions (custom fields, MailerLite-style)

Revision ID: 022
Revises: 021
Create Date: 2025-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscriber_field_definitions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("field_type", sa.String(16), nullable=False, server_default="text"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscriber_field_definitions_id"), "subscriber_field_definitions", ["id"], unique=False)
    op.create_index(op.f("ix_subscriber_field_definitions_key"), "subscriber_field_definitions", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_subscriber_field_definitions_key"), table_name="subscriber_field_definitions")
    op.drop_index(op.f("ix_subscriber_field_definitions_id"), table_name="subscriber_field_definitions")
    op.drop_table("subscriber_field_definitions")
