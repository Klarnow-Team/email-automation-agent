"""Vacation blocks and calendar connections (availability engine)

Revision ID: 011
Revises: 010
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vacation_blocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("team_member_id", sa.Integer(), nullable=True),
        sa.Column("event_type_id", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["event_type_id"], ["event_types.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_member_id"], ["team_members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "(event_type_id IS NOT NULL) OR (team_member_id IS NOT NULL)",
            name="vacation_blocks_scope",
        ),
    )
    op.create_index("ix_vacation_blocks_event_type_id", "vacation_blocks", ["event_type_id"], unique=False)
    op.create_index("ix_vacation_blocks_team_member_id", "vacation_blocks", ["team_member_id"], unique=False)

    op.create_table(
        "calendar_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("team_member_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("sync_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["team_member_id"], ["team_members.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_calendar_connections_team_member_id", "calendar_connections", ["team_member_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_calendar_connections_team_member_id", table_name="calendar_connections")
    op.drop_table("calendar_connections")
    op.drop_index("ix_vacation_blocks_team_member_id", table_name="vacation_blocks")
    op.drop_index("ix_vacation_blocks_event_type_id", table_name="vacation_blocks")
    op.drop_table("vacation_blocks")
