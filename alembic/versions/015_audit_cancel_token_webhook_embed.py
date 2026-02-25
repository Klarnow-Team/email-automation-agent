"""Audit log, booking cancel_token, webhook secret, embed options

Revision ID: 015
Revises: 014
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("details", JSONB(), nullable=True),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"], unique=False)
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False)
    op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"], unique=False)

    op.add_column("bookings", sa.Column("cancel_token", sa.String(64), nullable=True))
    op.create_index("ix_bookings_cancel_token", "bookings", ["cancel_token"], unique=False)

    op.add_column("webhook_subscriptions", sa.Column("secret", sa.String(255), nullable=True))

    op.add_column("booking_profiles", sa.Column("embed_primary_color", sa.String(20), nullable=True))
    op.add_column("booking_profiles", sa.Column("embed_layout", sa.String(20), nullable=False, server_default=sa.text("'full'")))
    op.add_column("booking_profiles", sa.Column("embed_type", sa.String(20), nullable=False, server_default=sa.text("'inline'")))


def downgrade() -> None:
    op.drop_column("booking_profiles", "embed_type")
    op.drop_column("booking_profiles", "embed_layout")
    op.drop_column("booking_profiles", "embed_primary_color")
    op.drop_column("webhook_subscriptions", "secret")
    op.drop_index("ix_bookings_cancel_token", table_name="bookings")
    op.drop_column("bookings", "cancel_token")
    op.drop_index("ix_audit_logs_resource_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_id", table_name="audit_logs")
    op.drop_table("audit_logs")
