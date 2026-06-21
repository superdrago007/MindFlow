from fastapi import FastAPI
from app.routers.auth_router import auth_router
from app.routers.forgot_password_router import forgot_password_router
from app.routers.note_router import note_router
from app.routers.profile_router import profile_router
from app.routers.tag_router import tag_router
from app.models.Note_Model import Note  # noqa: F401
from app.models.Note_Link_Model import NoteLink  # noqa: F401
from app.models.Note_Tag_Model import NoteTag  # noqa: F401
from app.models.Refresh_Token_Model import Refresh_Token  # noqa: F401
from app.models.Tag_Model import Tag  # noqa: F401
from app.models.User_Model import User  # noqa: F401
import logging

app = FastAPI()

app.include_router(auth_router)
app.include_router(forgot_password_router)
app.include_router(profile_router)
app.include_router(note_router)
app.include_router(tag_router)

logging.basicConfig(
    level=logging.INFO, # Change to DEBUG to see the detailed logs
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
