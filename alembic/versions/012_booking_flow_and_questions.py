"""Booking flow (user side): confirmation mode, questions, form responses, GDPR

Revision ID: 012
Revises: 011
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("event_types", sa.Column("confirmation_mode", sa.String(20), nullable=False, server_default="instant"))
    op.add_column("event_types", sa.Column("send_calendar_invite", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("event_types", sa.Column("send_email_confirmation", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("event_types", sa.Column("send_sms_confirmation", sa.Boolean(), nullable=False, server_default="false"))

    op.create_table(
        "booking_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_type_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("question_type", sa.String(20), nullable=False),
        sa.Column("label", sa.String(500), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("options", sa.Text(), nullable=True),
        sa.Column("show_if", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["event_type_id"], ["event_types.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_booking_questions_event_type_id", "booking_questions", ["event_type_id"], unique=False)

    op.add_column("bookings", sa.Column("attendee_phone", sa.String(50), nullable=True))
    op.add_column("bookings", sa.Column("form_responses", sa.Text(), nullable=True))
    op.add_column("bookings", sa.Column("gdpr_consent", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("bookings", "gdpr_consent")
    op.drop_column("bookings", "form_responses")
    op.drop_column("bookings", "attendee_phone")
    op.drop_index("ix_booking_questions_event_type_id", table_name="booking_questions")
    op.drop_table("booking_questions")
    op.drop_column("event_types", "send_sms_confirmation")
    op.drop_column("event_types", "send_email_confirmation")
    op.drop_column("event_types", "send_calendar_invite")
    op.drop_column("event_types", "confirmation_mode")
