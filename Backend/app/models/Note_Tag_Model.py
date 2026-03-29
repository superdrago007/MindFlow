from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.config.db_config import Base


class NoteTag(Base):
    __tablename__ = "note_tags"

    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.note_id", ondelete="CASCADE"), primary_key=True, nullable=False)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("tags.tag_id", ondelete="CASCADE"), primary_key=True, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
