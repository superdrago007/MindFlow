from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    # Primary Key (serial4 maps to Integer)
    user_id = Column(Integer, primary_key=True, autoincrement=True)

    # Columns
    full_name = Column(String(100), nullable=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    profile_pic = Column(Text, nullable=True)
    
    # Defaults and Roles
    user_role = Column(String(20), nullable=False, server_default="user")
    is_active = Column(Boolean, nullable=False, server_default="true")

    # Timestamps
    # server_default lets the Database handle the initial 'CURRENT_TIMESTAMP'
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # onupdate tells SQLAlchemy to update this field locally during an UPDATE query
    updated_at = Column(
        DateTime, 
        nullable=False, 
        server_default=func.now(), 
        onupdate=func.now()
    )