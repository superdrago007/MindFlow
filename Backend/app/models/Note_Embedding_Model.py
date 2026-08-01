from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
 
from app.config.db_config import Base
 
 
class NoteEmbedding(Base):
    __tablename__ = "note_embeddings"
 
    note_embedding_id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
 
    # Which note this chunk belongs to. Cascade delete keeps embeddings
    # in sync automatically — removing a note wipes its vectors too.
    note_id = Column(
        UUID(as_uuid=True),
        ForeignKey("notes.note_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
 
    # Denormalized from Note so retrieval can filter by user without a join,
    # consistent with how Note_Model and Tag_Model handle user ownership.
    user_id = Column(Integer, nullable=False, index=True)
 
    # Position of this chunk within the note (0-indexed). Lets us reassemble
    # chunks in order and skip re-embedding unchanged leading chunks later.
    chunk_index = Column(Integer, nullable=False)
 
    # The plain text that was actually embedded — stored so the agent can
    # return it as part of the citation without a second DB round-trip.
    chunk_text = Column(Text, nullable=False)

    embedding_model = Column(Text, nullable=False)
 
    # 384-dim vector produced by bge-small-en-v1.5.
    # Dimension must match the model — changing it requires a full re-index.
    embedding = Column(Vector(384), nullable=False)
 
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
