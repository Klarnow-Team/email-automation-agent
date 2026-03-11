"""Subscriber phone and campaign channel (WhatsApp)

Revision ID: 020
Revises: 019
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("subscribers", sa.Column("phone", sa.String(32), nullable=True))
    op.add_column(
        "campaigns",
        sa.Column("channel", sa.String(16), nullable=False, server_default=sa.text("'email'")),
    )


def downgrade() -> None:
    op.drop_column("campaigns", "channel")
    op.drop_column("subscribers", "phone")
