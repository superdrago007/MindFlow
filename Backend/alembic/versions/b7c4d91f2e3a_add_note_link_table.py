"""add note_links table

Revision ID: b7c4d91f2e3a
Revises: a3f2c9d7e841
Create Date: 2026-03-30 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b7c4d91f2e3a"
down_revision: Union[str, Sequence[str], None] = "a3f2c9d7e841"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "note_links",
        sa.Column("note_link_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_note_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_note_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["source_note_id"], ["notes.note_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_note_id"], ["notes.note_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("note_link_id"),
        sa.UniqueConstraint("source_note_id", "target_note_id", name="uq_note_link_source_target"),
        sa.CheckConstraint("source_note_id <> target_note_id", name="ck_note_link_no_self_link"),
    )
    op.create_index("ix_note_link_source_note_id", "note_links", ["source_note_id"], unique=False)
    op.create_index("ix_note_link_target_note_id", "note_links", ["target_note_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_note_link_target_note_id", table_name="note_links")
    op.drop_index("ix_note_link_source_note_id", table_name="note_links")
    op.drop_table("note_links")
