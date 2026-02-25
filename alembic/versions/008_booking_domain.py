"""Booking domain: event_types, team_members, bookings, availability

Revision ID: 008
Revises: 007
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "event_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_event_types_slug", "event_types", ["slug"], unique=True)

    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_type_id", sa.Integer(), nullable=False),
        sa.Column("team_member_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attendee_name", sa.String(255), nullable=True),
        sa.Column("attendee_email", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum("pending_confirmation", "confirmed", "cancelled", "rescheduled", name="bookingstatus"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["event_type_id"], ["event_types.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_member_id"], ["team_members.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bookings_event_type_id", "bookings", ["event_type_id"], unique=False)
    op.create_index("ix_bookings_start_at", "bookings", ["start_at"], unique=False)

    op.create_table(
        "availability",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_type_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(["event_type_id"], ["event_types.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("availability")
    op.drop_index("ix_bookings_start_at", table_name="bookings")
    op.drop_index("ix_bookings_event_type_id", table_name="bookings")
    op.drop_table("bookings")
    op.drop_table("team_members")
    op.drop_index("ix_event_types_slug", table_name="event_types")
    op.drop_table("event_types")
    op.execute("DROP TYPE IF EXISTS bookingstatus")
