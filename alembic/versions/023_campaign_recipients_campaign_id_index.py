"""Add index on campaign_recipients.campaign_id for faster list_campaigns

Revision ID: 023
Revises: 022
Create Date: 2025-03-11

"""
from typing import Sequence, Union

from alembic import op

revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_campaign_recipients_campaign_id",
        "campaign_recipients",
        ["campaign_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_campaign_recipients_campaign_id", table_name="campaign_recipients")
