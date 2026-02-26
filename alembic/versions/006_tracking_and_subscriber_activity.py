"""Tracking events and subscriber activity timeline

Revision ID: 006
Revises: 005
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tracking_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=True),
        sa.Column("subscriber_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("payload", JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subscriber_id"], ["subscribers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tracking_events_subscriber_id", "tracking_events", ["subscriber_id"], unique=False)
    op.create_index("ix_tracking_events_campaign_id", "tracking_events", ["campaign_id"], unique=False)

    op.create_table(
        "subscriber_activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("subscriber_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["subscriber_id"], ["subscribers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subscriber_activities_subscriber_id", "subscriber_activities", ["subscriber_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_subscriber_activities_subscriber_id", table_name="subscriber_activities")
    op.drop_table("subscriber_activities")
    op.drop_index("ix_tracking_events_campaign_id", table_name="tracking_events")
    op.drop_index("ix_tracking_events_subscriber_id", table_name="tracking_events")
    op.drop_table("tracking_events")
