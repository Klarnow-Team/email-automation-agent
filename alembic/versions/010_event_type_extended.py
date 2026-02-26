"""Event type extended: description, location, buffer, limits, overrides, members

Revision ID: 010
Revises: 009
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # EventType: basic settings
    op.add_column("event_types", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("event_types", sa.Column("location_type", sa.String(50), nullable=True))
    op.add_column("event_types", sa.Column("location_link", sa.String(500), nullable=True))
    op.add_column("event_types", sa.Column("buffer_before_minutes", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("event_types", sa.Column("buffer_after_minutes", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("event_types", sa.Column("minimum_notice_minutes", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("event_types", sa.Column("date_range_start_days", sa.Integer(), nullable=True))
    op.add_column("event_types", sa.Column("date_range_end_days", sa.Integer(), nullable=True))
    op.add_column("event_types", sa.Column("max_bookings_per_day", sa.Integer(), nullable=True))
    op.add_column("event_types", sa.Column("max_future_bookings", sa.Integer(), nullable=True))
    op.add_column("event_types", sa.Column("timezone", sa.String(64), nullable=True))
    op.add_column("event_types", sa.Column("slot_capacity", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("event_types", sa.Column("max_bookings_per_invitee", sa.Integer(), nullable=True))
    op.add_column("event_types", sa.Column("max_bookings_per_invitee_period_days", sa.Integer(), nullable=True))

    # Availability override: specific dates (unavailable or custom times)
    op.create_table(
        "availability_overrides",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_type_id", sa.Integer(), nullable=False),
        sa.Column("override_date", sa.Date(), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.ForeignKeyConstraint(["event_type_id"], ["event_types.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_availability_overrides_event_type_date", "availability_overrides", ["event_type_id", "override_date"], unique=True)

    # EventTypeMember: for round robin / pooled (which team members serve this event type)
    op.create_table(
        "event_type_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_type_id", sa.Integer(), nullable=False),
        sa.Column("team_member_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["event_type_id"], ["event_types.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_member_id"], ["team_members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_event_type_members_event_type_id", "event_type_members", ["event_type_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_event_type_members_event_type_id", table_name="event_type_members")
    op.drop_table("event_type_members")
    op.drop_index("ix_availability_overrides_event_type_date", table_name="availability_overrides")
    op.drop_table("availability_overrides")

    op.drop_column("event_types", "max_bookings_per_invitee_period_days")
    op.drop_column("event_types", "max_bookings_per_invitee")
    op.drop_column("event_types", "slot_capacity")
    op.drop_column("event_types", "timezone")
    op.drop_column("event_types", "max_future_bookings")
    op.drop_column("event_types", "max_bookings_per_day")
    op.drop_column("event_types", "date_range_end_days")
    op.drop_column("event_types", "date_range_start_days")
    op.drop_column("event_types", "minimum_notice_minutes")
    op.drop_column("event_types", "buffer_after_minutes")
    op.drop_column("event_types", "buffer_before_minutes")
    op.drop_column("event_types", "location_link")
    op.drop_column("event_types", "location_type")
    op.drop_column("event_types", "description")
