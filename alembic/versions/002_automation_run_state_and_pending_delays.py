"""Automation run state + pending delays for background processing

Revision ID: 002
Revises: 001
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("automation_runs", sa.Column("paused", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("automation_runs", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("automation_runs", sa.Column("error_message", sa.Text(), nullable=True))

    op.create_table(
        "automation_pending_delays",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("execute_after", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["automation_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_automation_pending_delays_execute_after", "automation_pending_delays", ["execute_after"], unique=False)
    op.create_index("ix_automation_pending_delays_run_id", "automation_pending_delays", ["run_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_automation_pending_delays_run_id", table_name="automation_pending_delays")
    op.drop_index("ix_automation_pending_delays_execute_after", table_name="automation_pending_delays")
    op.drop_table("automation_pending_delays")
    op.drop_column("automation_runs", "error_message")
    op.drop_column("automation_runs", "completed_at")
    op.drop_column("automation_runs", "paused")
