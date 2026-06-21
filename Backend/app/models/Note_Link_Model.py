from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.config.db_config import Base


class NoteLink(Base):
    __tablename__ = "note_links"

    note_link_id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    source_note_id = Column(
        UUID(as_uuid=True),
        ForeignKey("notes.note_id", ondelete="CASCADE"),
        nullable=False,
    )
    target_note_id = Column(
        UUID(as_uuid=True),
        ForeignKey("notes.note_id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("source_note_id", "target_note_id", name="uq_note_link_source_target"),
        CheckConstraint("source_note_id <> target_note_id", name="ck_note_link_no_self_link"),
        Index("ix_note_link_source_note_id", "source_note_id"),
        Index("ix_note_link_target_note_id", "target_note_id"),
    )
