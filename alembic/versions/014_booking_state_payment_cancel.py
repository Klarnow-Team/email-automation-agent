"""Booking state model + payment + reschedule/cancel controls

Revision ID: 014
Revises: 013
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # BookingStatus enum: add completed, refunded
    op.execute("ALTER TYPE bookingstatus ADD VALUE 'completed'")
    op.execute("ALTER TYPE bookingstatus ADD VALUE 'refunded'")

    # EventType: payment and reschedule/cancel
    op.add_column("event_types", sa.Column("payment_required", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("event_types", sa.Column("price", sa.Numeric(10, 2), nullable=True))
    op.add_column("event_types", sa.Column("currency", sa.String(3), nullable=False, server_default=sa.text("'USD'")))
    op.add_column("event_types", sa.Column("cancel_unpaid_after_minutes", sa.Integer(), nullable=True))
    op.add_column("event_types", sa.Column("allow_cancellation", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("event_types", sa.Column("allow_reschedule", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("event_types", sa.Column("cancellation_deadline_minutes", sa.Integer(), nullable=True))
    op.add_column("event_types", sa.Column("cancellation_message", sa.Text(), nullable=True))
    op.add_column("event_types", sa.Column("redirect_after_cancellation_url", sa.String(500), nullable=True))

    # Booking: payment tracking
    op.add_column("bookings", sa.Column("payment_status", sa.String(20), nullable=False, server_default=sa.text("'none'")))
    op.add_column("bookings", sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True))
    op.add_column("bookings", sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("bookings", sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("bookings", sa.Column("currency", sa.String(3), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "currency")
    op.drop_column("bookings", "refunded_at")
    op.drop_column("bookings", "paid_at")
    op.drop_column("bookings", "stripe_payment_intent_id")
    op.drop_column("bookings", "payment_status")
    op.drop_column("event_types", "redirect_after_cancellation_url")
    op.drop_column("event_types", "cancellation_message")
    op.drop_column("event_types", "cancellation_deadline_minutes")
    op.drop_column("event_types", "allow_reschedule")
    op.drop_column("event_types", "allow_cancellation")
    op.drop_column("event_types", "cancel_unpaid_after_minutes")
    op.drop_column("event_types", "currency")
    op.drop_column("event_types", "price")
    op.drop_column("event_types", "payment_required")
