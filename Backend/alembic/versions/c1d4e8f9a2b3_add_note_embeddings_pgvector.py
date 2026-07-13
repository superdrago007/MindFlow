"""add note embeddings with pgvector

Revision ID: c1d4e8f9a2b3
Revises: b7c4d91f2e3a
Create Date: 2026-07-13 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d4e8f9a2b3"
down_revision: Union[str, Sequence[str], None] = "b7c4d91f2e3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS note_embeddings (
            note_embedding_id BIGSERIAL PRIMARY KEY,
            note_id UUID NOT NULL REFERENCES notes(note_id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL DEFAULT 0,
            chunk_text TEXT,
            embedding_model TEXT NOT NULL,
            embedding vector(1536) NOT NULL,
            content_hash TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_note_embeddings_note_chunk_model
                UNIQUE (note_id, chunk_index, embedding_model)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_note_embeddings_note_id
        ON note_embeddings (note_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_note_embeddings_user_id
        ON note_embeddings (user_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_note_embeddings_embedding_hnsw
        ON note_embeddings
        USING hnsw (embedding vector_cosine_ops)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_note_embeddings_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS ix_note_embeddings_user_id")
    op.execute("DROP INDEX IF EXISTS ix_note_embeddings_note_id")
    op.execute("DROP TABLE IF EXISTS note_embeddings")
    op.execute("DROP EXTENSION IF EXISTS vector")
