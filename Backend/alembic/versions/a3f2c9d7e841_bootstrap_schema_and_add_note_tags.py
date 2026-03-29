"""bootstrap schema and add note tags

Revision ID: a3f2c9d7e841
Revises:
Create Date: 2026-03-29 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a3f2c9d7e841"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    try:
        indexes = inspector.get_indexes(table_name)
    except sa.exc.NoSuchTableError:
        return False
    return any(index.get("name") == index_name for index in indexes)


def _check_constraint_exists(inspector: sa.Inspector, table_name: str, constraint_name: str) -> bool:
    try:
        constraints = inspector.get_check_constraints(table_name)
    except sa.exc.NoSuchTableError:
        return False
    return any(constraint.get("name") == constraint_name for constraint in constraints)


def _refresh_inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _upgrade_offline() -> None:
    op.create_table(
        "users",
        sa.Column("user_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=True),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("profile_pic", sa.Text(), nullable=True),
        sa.Column("user_role", sa.String(length=20), server_default="user", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("refresh_token_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("refresh_token_id"),
    )

    op.create_table(
        "notes",
        sa.Column("note_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("last_viewed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("note_id"),
    )
    op.create_index("ix_notes_user_id", "notes", ["user_id"], unique=False)

    op.create_table(
        "tags",
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("tag_id"),
    )
    op.create_index("ix_tags_user_id", "tags", ["user_id"], unique=False)
    op.create_check_constraint("ck_tags_name_not_blank", "tags", "char_length(btrim(name)) > 0")
    op.create_index(
        "ux_tags_user_id_lower_name",
        "tags",
        ["user_id", sa.text("lower(name)")],
        unique=True,
    )

    op.create_table(
        "note_tags",
        sa.Column("note_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["note_id"], ["notes.note_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.tag_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("note_id", "tag_id"),
    )


def upgrade() -> None:
    if context.is_offline_mode():
        _upgrade_offline()
        return

    inspector = _refresh_inspector()

    if not _table_exists(inspector, "users"):
        op.create_table(
            "users",
            sa.Column("user_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("full_name", sa.String(length=100), nullable=True),
            sa.Column("username", sa.String(length=50), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("password_hash", sa.Text(), nullable=False),
            sa.Column("profile_pic", sa.Text(), nullable=True),
            sa.Column("user_role", sa.String(length=20), server_default="user", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("user_id"),
            sa.UniqueConstraint("username"),
            sa.UniqueConstraint("email"),
        )
        inspector = _refresh_inspector()

    if not _table_exists(inspector, "refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("refresh_token_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("refresh_token", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("refresh_token_id"),
        )
        inspector = _refresh_inspector()

    if not _table_exists(inspector, "notes"):
        op.create_table(
            "notes",
            sa.Column("note_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("title", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("last_viewed_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("note_id"),
        )
        inspector = _refresh_inspector()

    if _table_exists(inspector, "notes") and not _index_exists(inspector, "notes", "ix_notes_user_id"):
        op.create_index("ix_notes_user_id", "notes", ["user_id"], unique=False)
        inspector = _refresh_inspector()

    if not _table_exists(inspector, "tags"):
        op.create_table(
            "tags",
            sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=50), nullable=False),
            sa.Column("color", sa.String(length=7), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("tag_id"),
        )
        inspector = _refresh_inspector()

    if _table_exists(inspector, "tags"):
        if not _index_exists(inspector, "tags", "ix_tags_user_id"):
            op.create_index("ix_tags_user_id", "tags", ["user_id"], unique=False)
            inspector = _refresh_inspector()

        columns = {column["name"]: column for column in inspector.get_columns("tags")}
        color_column = columns.get("color")
        current_color_length = getattr(color_column.get("type"), "length", None) if color_column else None
        if current_color_length != 7:
            op.alter_column(
                "tags",
                "color",
                existing_type=color_column.get("type") if color_column else sa.String(length=20),
                type_=sa.String(length=7),
                existing_nullable=True,
            )
            inspector = _refresh_inspector()

        if not _check_constraint_exists(inspector, "tags", "ck_tags_name_not_blank"):
            op.create_check_constraint("ck_tags_name_not_blank", "tags", "char_length(btrim(name)) > 0")
            inspector = _refresh_inspector()

        if not _index_exists(inspector, "tags", "ux_tags_user_id_lower_name"):
            op.create_index(
                "ux_tags_user_id_lower_name",
                "tags",
                ["user_id", sa.text("lower(name)")],
                unique=True,
            )
            inspector = _refresh_inspector()

    if not _table_exists(inspector, "note_tags"):
        op.create_table(
            "note_tags",
            sa.Column("note_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["note_id"], ["notes.note_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["tag_id"], ["tags.tag_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("note_id", "tag_id"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _table_exists(inspector, "note_tags"):
        op.drop_table("note_tags")

    inspector = sa.inspect(bind)
    if _table_exists(inspector, "tags"):
        if _index_exists(inspector, "tags", "ux_tags_user_id_lower_name"):
            op.drop_index("ux_tags_user_id_lower_name", table_name="tags")
        if _check_constraint_exists(inspector, "tags", "ck_tags_name_not_blank"):
            op.drop_constraint("ck_tags_name_not_blank", "tags", type_="check")
