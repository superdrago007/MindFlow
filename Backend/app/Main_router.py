from fastapi import FastAPI
from app.routers.auth_router import auth_router
from app.routers.forgot_password_router import forgot_password_router
from app.routers.note_router import note_router
from app.routers.profile_router import profile_router
from app.config.db_config import engine, Base
# Import all models so SQLAlchemy knows about them when creating tables
from app.models.Note_Model import Note
from app.models.User_Model import User
from app.models.Refresh_Token_Model import Refresh_Token
from app.models.Tag_Model import Tag
import logging

app = FastAPI()

# Ensure DB tables are created (for development). In production use migrations.
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(forgot_password_router)
app.include_router(profile_router)
app.include_router(note_router)

logging.basicConfig(
    level=logging.INFO, # Change to DEBUG to see the detailed logs
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
