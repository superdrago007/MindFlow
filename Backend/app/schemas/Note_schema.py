from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class SaveNoteRequest(BaseModel):
    note_id: Optional[UUID] = None
    title: dict[str, Any]
    content: dict[str, Any]
    tag_ids: Optional[list[UUID]] = None


class SaveNoteResponse(BaseModel):
    note_id: UUID
    operation: Literal["created", "updated"]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_viewed_at: Optional[datetime]


class NoteTagSummaryResponse(BaseModel):
    tag_id: UUID
    name: str
    color: Optional[str] = None


class RecentNoteCardResponse(BaseModel):
    note_id: UUID
    title: str
    preview: str
    time: str
    tags: list[NoteTagSummaryResponse]


class NoteDetailResponse(BaseModel):
    note_id: UUID
    title: Optional[dict[str, Any]]
    title_text: str
    content: dict[str, Any]
    tags: list[NoteTagSummaryResponse]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_viewed_at: Optional[datetime]
