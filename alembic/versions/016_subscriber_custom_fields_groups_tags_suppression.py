"""Subscriber custom_fields, groups, tags, suppression list

Revision ID: 016
Revises: 015
Create Date: 2025-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "subscribers",
        sa.Column("custom_fields", JSONB(), nullable=False, server_default=sa.text("'{}'")),
    )

    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_groups_id"), "groups", ["id"], unique=False)

    op.create_table(
        "subscriber_groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("subscriber_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["subscriber_id"], ["subscribers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscriber_groups_id"), "subscriber_groups", ["id"], unique=False)
    op.create_index("ix_subscriber_groups_subscriber_group", "subscriber_groups", ["subscriber_id", "group_id"], unique=True)

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tags_id"), "tags", ["id"], unique=False)

    op.create_table(
        "subscriber_tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("subscriber_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["subscriber_id"], ["subscribers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscriber_tags_id"), "subscriber_tags", ["id"], unique=False)
    op.create_index("ix_subscriber_tags_subscriber_tag", "subscriber_tags", ["subscriber_id", "tag_id"], unique=True)

    op.create_table(
        "suppression_list",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.Enum("email", "domain", name="suppressiontype"), nullable=False),
        sa.Column("value", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_suppression_list_id"), "suppression_list", ["id"], unique=False)
    op.create_index("ix_suppression_list_type_value", "suppression_list", ["type", "value"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_suppression_list_type_value", table_name="suppression_list")
    op.drop_index(op.f("ix_suppression_list_id"), table_name="suppression_list")
    op.drop_table("suppression_list")
    op.drop_index("ix_subscriber_tags_subscriber_tag", table_name="subscriber_tags")
    op.drop_index(op.f("ix_subscriber_tags_id"), table_name="subscriber_tags")
    op.drop_table("subscriber_tags")
    op.drop_index(op.f("ix_tags_id"), table_name="tags")
    op.drop_table("tags")
    op.drop_index("ix_subscriber_groups_subscriber_group", table_name="subscriber_groups")
    op.drop_index(op.f("ix_subscriber_groups_id"), table_name="subscriber_groups")
    op.drop_table("subscriber_groups")
    op.drop_index(op.f("ix_groups_id"), table_name="groups")
    op.drop_table("groups")
    op.drop_column("subscribers", "custom_fields")
    op.execute("DROP TYPE IF EXISTS suppressiontype")
