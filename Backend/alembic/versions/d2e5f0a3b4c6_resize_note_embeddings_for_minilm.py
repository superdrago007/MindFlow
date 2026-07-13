"""resize note embeddings for all-MiniLM-L6-v2

Revision ID: d2e5f0a3b4c6
Revises: c1d4e8f9a2b3
Create Date: 2026-07-14 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2e5f0a3b4c6"
down_revision: Union[str, Sequence[str], None] = "c1d4e8f9a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_note_embeddings_embedding_hnsw")
    op.execute(
        "ALTER TABLE note_embeddings "
        "ALTER COLUMN embedding TYPE vector(384)"
    )
    op.execute(
        "CREATE INDEX ix_note_embeddings_embedding_hnsw "
        "ON note_embeddings USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_note_embeddings_embedding_hnsw")
    op.execute(
        "ALTER TABLE note_embeddings "
        "ALTER COLUMN embedding TYPE vector(1536)"
    )
    op.execute(
        "CREATE INDEX ix_note_embeddings_embedding_hnsw "
        "ON note_embeddings USING hnsw (embedding vector_cosine_ops)"
    )
