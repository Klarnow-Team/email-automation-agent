"""Campaign: plain_body, scheduled_at, A/B fields; CampaignRecipient variant

Revision ID: 017
Revises: 016
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("campaigns", sa.Column("plain_body", sa.Text(), nullable=True))
    op.add_column("campaigns", sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("campaigns", sa.Column("ab_subject_b", sa.String(500), nullable=True))
    op.add_column("campaigns", sa.Column("ab_html_body_b", sa.Text(), nullable=True))
    op.add_column("campaigns", sa.Column("ab_split_percent", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("campaigns", sa.Column("ab_winner", sa.String(1), nullable=True))
    op.add_column("campaign_recipients", sa.Column("variant", sa.String(1), nullable=True))


def downgrade() -> None:
    op.drop_column("campaign_recipients", "variant")
    op.drop_column("campaigns", "ab_winner")
    op.drop_column("campaigns", "ab_split_percent")
    op.drop_column("campaigns", "ab_html_body_b")
    op.drop_column("campaigns", "ab_subject_b")
    op.drop_column("campaigns", "scheduled_at")
    op.drop_column("campaigns", "plain_body")
