"""Add campaign builder_state persistence

Revision ID: 024
Revises: 023
Create Date: 2026-03-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "024"
down_revision: Union[str, None] = "023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("campaigns", sa.Column("builder_state", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("campaigns", "builder_state")
