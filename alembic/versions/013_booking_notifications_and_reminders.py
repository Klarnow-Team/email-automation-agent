"""Booking notifications: host/team emails, reminders, no_show status

Revision ID: 013
Revises: 012
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "event_types",
        sa.Column("booking_notification_emails", sa.Text(), nullable=True),
    )
    op.add_column(
        "event_types",
        sa.Column("reminder_minutes_before", sa.Text(), nullable=True),
    )

    # Add no_show to bookingstatus enum (PostgreSQL)
    # PostgreSQL: ADD VALUE may fail if run twice; use IF NOT EXISTS on PG 15+
    op.execute("ALTER TYPE bookingstatus ADD VALUE 'no_show'")

    op.create_table(
        "booking_reminders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("remind_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False, server_default="email"),
        sa.Column("minutes_before", sa.Integer(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_booking_reminders_booking_id", "booking_reminders", ["booking_id"], unique=False)
    op.create_index("ix_booking_reminders_remind_at_sent", "booking_reminders", ["remind_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_booking_reminders_remind_at_sent", table_name="booking_reminders")
    op.drop_index("ix_booking_reminders_booking_id", table_name="booking_reminders")
    op.drop_table("booking_reminders")
    # PostgreSQL: cannot remove enum value easily; leave no_show
    op.drop_column("event_types", "reminder_minutes_before")
    op.drop_column("event_types", "booking_notification_emails")
