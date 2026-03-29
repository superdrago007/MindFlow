from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.db_config import get_db
from app.schemas.Tag_schema import CreateTagRequest, TagResponse, UpdateTagRequest
from app.services.tag_service import create_user_tag, list_user_tags, update_user_tag
from app.utils.auth_utils import get_current_user

tag_router = APIRouter(prefix="/profile", tags=["Tags"])


@tag_router.get("/tags", response_model=list[TagResponse])
async def get_user_tags(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await list_user_tags(current_user, db)


@tag_router.post("/tags", response_model=TagResponse)
async def create_tag(
    payload: CreateTagRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await create_user_tag(payload, current_user, db)


@tag_router.patch("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: UUID,
    payload: UpdateTagRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await update_user_tag(tag_id, payload, current_user, db)
