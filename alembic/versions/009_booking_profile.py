"""Booking profile: public profile and booking page controls

Revision ID: 009
Revises: 008
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "booking_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("profile_photo_url", sa.String(500), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("timezone_auto_detect", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("social_links", JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("custom_branding_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("hidden_event_type_ids", JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("custom_url_slug", sa.String(100), nullable=True),
        sa.Column("custom_domain", sa.String(255), nullable=True),
        sa.Column("seo_title", sa.String(255), nullable=True),
        sa.Column("seo_description", sa.Text(), nullable=True),
        sa.Column("seo_image_url", sa.String(500), nullable=True),
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_booking_profiles_username", "booking_profiles", ["username"], unique=True)
    op.execute(
        "INSERT INTO booking_profiles (id, username, timezone, timezone_auto_detect, custom_branding_enabled, language) "
        "VALUES (1, 'me', 'UTC', true, false, 'en')"
    )


def downgrade() -> None:
    op.drop_index("ix_booking_profiles_username", table_name="booking_profiles")
    op.drop_table("booking_profiles")
