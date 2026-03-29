import uuid

from sqlalchemy import Column, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.config.db_config import Base


class Note(Base):
    __tablename__ = "notes"

    note_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(Integer, nullable=False, index=True)
    title = Column(JSONB, nullable=True)
    content = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now())
    last_viewed_at = Column(DateTime, nullable=True)
    tags = relationship("Tag", secondary="note_tags", back_populates="notes")
