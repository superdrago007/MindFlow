import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, Index, Integer, String, Text, UUID, func
from sqlalchemy.orm import relationship

from app.config.db_config import Base


class Tag(Base):
    __tablename__ = "tags"

    tag_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    color = Column(String(7), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    notes = relationship("Note", secondary="note_tags", back_populates="tags")

    __table_args__ = (
        CheckConstraint("char_length(btrim(name)) > 0", name="ck_tags_name_not_blank"),
        Index("ux_tags_user_id_lower_name", "user_id", func.lower(name), unique=True),
    )
    
