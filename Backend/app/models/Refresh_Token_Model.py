from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from app.config.db_config import Base

class Refresh_Token(Base):
    __tablename__ = "refresh_tokens"

    # Primary Key (serial4 maps to Integer)
    refresh_token_id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign Key to User
    user_id = Column(Integer, nullable=False)

    # Token Data
    refresh_token = Column(Text, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    expires_at = Column(DateTime, nullable=False)