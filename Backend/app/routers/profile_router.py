from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.Meta_data_schema import MetaDataResponse
from app.config.db_config import get_db
from app.models.User_Model import User
from app.models.Tag_Model import Tag
from app.models.Note_Model import Note
from app.schemas.User_schema import ProfileResponse
from app.utils.auth_utils import extract_user_id_from_token, get_current_user

profile_router = APIRouter(tags=["Profile"])


@profile_router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = extract_user_id_from_token(current_user)
    db_user = db.query(User).filter(User.user_id == user_id).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": db_user.user_id,
        "username": db_user.username,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "role": db_user.user_role,
        "is_active": db_user.is_active,
        "profile_pic": db_user.profile_pic,
    }


@profile_router.get("/profile/metadata", response_model=MetaDataResponse)
def get_profile_metadata(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = extract_user_id_from_token(current_user)

    total_notes = db.query(Note).filter(Note.user_id == user_id).count()
    total_tags = db.query(Tag).filter(Tag.user_id == user_id).count()
    # TODO: Implement connection counting when connection feature is ready
    total_connections = 0

    return MetaDataResponse(
        Total_Notes=total_notes,
        Total_Tags=total_tags,
        Total_Connections=total_connections
    )