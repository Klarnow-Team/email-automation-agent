"""Forms and form submissions

Revision ID: 018
Revises: 017
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "forms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("form_type", sa.String(32), nullable=False, server_default=sa.text("'embed'")),
        sa.Column("fields", JSONB(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("success_message", sa.Text(), nullable=True),
        sa.Column("redirect_url", sa.String(500), nullable=True),
        sa.Column("add_to_group_id", sa.Integer(), nullable=True),
        sa.Column("trigger_automation_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["add_to_group_id"], ["groups.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["trigger_automation_id"], ["automations.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_forms_id"), "forms", ["id"], unique=False)

    op.create_table(
        "form_submissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("form_id", sa.Integer(), nullable=False),
        sa.Column("subscriber_id", sa.Integer(), nullable=True),
        sa.Column("payload", JSONB(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["form_id"], ["forms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subscriber_id"], ["subscribers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_form_submissions_id"), "form_submissions", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_form_submissions_id"), table_name="form_submissions")
    op.drop_table("form_submissions")
    op.drop_index(op.f("ix_forms_id"), table_name="forms")
    op.drop_table("forms")
