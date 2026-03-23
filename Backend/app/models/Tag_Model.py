from sqlalchemy import UUID, Column, Integer, String, Boolean, DateTime, Text, func
from app.config.db_config import Base
import uuid

class Tag(Base):
    __tablename__ = "tags" 
    tag_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    color = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now())
    
