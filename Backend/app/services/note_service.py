import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models.Note_Model import Note
from app.models.Tag_Model import Tag
from app.schemas.Note_schema import SaveNoteRequest
from app.utils.auth_utils import extract_user_id_from_token

logger = logging.getLogger(__name__)


def _deduplicate_tag_ids(tag_ids: list[UUID] | None) -> list[UUID]:
    if not tag_ids:
        return []

    return list(dict.fromkeys(tag_ids))


def _load_user_tags_by_ids(tag_ids: list[UUID], user_id: int, db: Session) -> dict[UUID, Tag]:
    if not tag_ids:
        return {}

    tags = db.query(Tag).filter(Tag.user_id == user_id, Tag.tag_id.in_(tag_ids)).all()
    if len(tags) != len(tag_ids):
        raise HTTPException(status_code=400, detail="One or more selected tags are invalid")

    return {tag.tag_id: tag for tag in tags}


def _serialize_note_tags(note: Note) -> list[dict]:
    ordered_tags = sorted(note.tags, key=lambda tag: tag.name.lower())
    return [
        {
            "tag_id": tag.tag_id,
            "name": tag.name,
            "color": tag.color,
        }
        for tag in ordered_tags
    ]


async def save_note(note_payload: SaveNoteRequest, current_user: dict, db: Session):
    user_id = extract_user_id_from_token(current_user)
    selected_tag_ids = _deduplicate_tag_ids(note_payload.tag_ids)
    tags_by_id = _load_user_tags_by_ids(selected_tag_ids, user_id, db)
    selected_tags = [tags_by_id[tag_id] for tag_id in selected_tag_ids]

    try:
        if note_payload.note_id is None:
            new_note = Note(
                user_id=user_id,
                title=note_payload.title,
                content=note_payload.content,
            )
            new_note.tags = selected_tags
            db.add(new_note)
            db.commit()
            db.refresh(new_note)

            return {
                "note_id": new_note.note_id,
                "operation": "created",
                "created_at": new_note.created_at,
                "updated_at": new_note.updated_at,
                "last_viewed_at": new_note.last_viewed_at,
            }

        existing_note = (
            db.query(Note)
            .options(selectinload(Note.tags))
            .filter(Note.note_id == note_payload.note_id, Note.user_id == user_id)
            .first()
        )

        if not existing_note:
            raise HTTPException(status_code=404, detail="Note not found")

        existing_note.title = note_payload.title
        existing_note.content = note_payload.content
        existing_note.updated_at = datetime.now(timezone.utc)
        existing_note.tags = selected_tags

        db.commit()
        db.refresh(existing_note)

        return {
            "note_id": existing_note.note_id,
            "operation": "updated",
            "created_at": existing_note.created_at,
            "updated_at": existing_note.updated_at,
            "last_viewed_at": existing_note.last_viewed_at,
        }

    except HTTPException as http_exc:
        db.rollback()
        raise http_exc

    except Exception:
        db.rollback()
        logger.exception("Unexpected error while saving note for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Internal Server Error")


def _collect_text_fragments(value: object) -> list[str]:
    fragments: list[str] = []

    if isinstance(value, dict):
        text_value = value.get("text")
        if isinstance(text_value, str) and text_value.strip():
            fragments.append(text_value.strip())

        for nested_value in value.values():
            fragments.extend(_collect_text_fragments(nested_value))
        return fragments

    if isinstance(value, list):
        for item in value:
            fragments.extend(_collect_text_fragments(item))
        return fragments

    return fragments


def _extract_plain_text(value: object, fallback: str) -> str:
    joined = " ".join(_collect_text_fragments(value)).strip()
    return joined if joined else fallback


def _truncate_preview(text: str, limit: int = 160) -> str:
    if len(text) <= limit:
        return text

    trimmed = text[: limit - 3].rstrip()
    return f"{trimmed}..."


def _normalize_to_utc(dt: datetime | None) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)


def _format_relative_time(dt: datetime | None) -> str:
    target = _normalize_to_utc(dt)
    now = datetime.now(timezone.utc)
    seconds = max(int((now - target).total_seconds()), 0)

    if seconds < 60:
        return "Just now"

    if seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"

    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"

    if seconds < 172800:
        return "Yesterday"

    days = seconds // 86400
    return f"{days} days ago"


async def get_recent_notes(current_user: dict, db: Session, limit: int = 5):
    user_id = extract_user_id_from_token(current_user)
    safe_limit = max(1, min(limit, 20))

    try:
        notes = (
            db.query(Note)
            .options(selectinload(Note.tags))
            .filter(Note.user_id == user_id)
            .order_by(func.coalesce(Note.updated_at, Note.created_at).desc())
            .limit(safe_limit)
            .all()
        )

        recent_cards = []
        for note in notes:
            note_title = _extract_plain_text(note.title, "Untitled Note")
            note_preview_text = _extract_plain_text(note.content, "No preview available")
            note_timestamp = note.updated_at or note.created_at

            recent_cards.append(
                {
                    "note_id": note.note_id,
                    "title": note_title,
                    "preview": _truncate_preview(note_preview_text, 160),
                    "time": _format_relative_time(note_timestamp),
                    "tags": _serialize_note_tags(note),
                }
            )

        return recent_cards

    except Exception:
        logger.exception("Unexpected error while loading recent notes for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def get_note_by_id(note_id: UUID, current_user: dict, db: Session):
    user_id = extract_user_id_from_token(current_user)

    try:
        note = (
            db.query(Note)
            .options(selectinload(Note.tags))
            .filter(Note.note_id == note_id, Note.user_id == user_id)
            .first()
        )
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        return {
            "note_id": note.note_id,
            "title": note.title,
            "title_text": _extract_plain_text(note.title, "Untitled Note"),
            "content": note.content,
            "tags": _serialize_note_tags(note),
            "created_at": note.created_at,
            "updated_at": note.updated_at,
            "last_viewed_at": note.last_viewed_at,
        }

    except HTTPException as http_exc:
        raise http_exc

    except Exception:
        logger.exception("Unexpected error while loading note_id=%s for user_id=%s", note_id, user_id)
        raise HTTPException(status_code=500, detail="Internal Server Error")
