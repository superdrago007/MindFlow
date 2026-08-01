from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.config.db_config import get_db
from app.schemas.Note_schema import (
    NoteDetailResponse,
    NoteSearchItemResponse,
    RecentNoteCardResponse,
    SaveNoteRequest,
    SaveNoteResponse,
)
from app.services.note_service import get_note_by_id, get_recent_notes, save_note, search_notes_for_links
from app.utils.auth_utils import get_current_user

note_router = APIRouter(prefix="/profile", tags=["Notes"])


@note_router.post("/notes", response_model=SaveNoteResponse)
async def save_profile_note(
    note_payload: SaveNoteRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await save_note(note_payload, current_user, db, background_tasks)


@note_router.get("/notes/recent", response_model=list[RecentNoteCardResponse])
async def get_recent_profile_notes(
    limit: int = Query(default=5, ge=1, le=20),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await get_recent_notes(current_user, db, limit)


@note_router.get("/notes/search", response_model=list[NoteSearchItemResponse])
async def search_profile_notes(
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=10, ge=1, le=25),
    exclude_note_id: UUID | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await search_notes_for_links(current_user, db, q=q, limit=limit, exclude_note_id=exclude_note_id)


@note_router.get("/notes/{note_id}", response_model=NoteDetailResponse)
async def get_profile_note(
    note_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await get_note_by_id(note_id, current_user, db)

