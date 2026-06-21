import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models.Note_Link_Model import NoteLink
from app.models.Note_Model import Note
from app.models.Tag_Model import Tag
from app.schemas.Note_schema import SaveNoteRequest
from app.utils.auth_utils import extract_user_id_from_token

logger = logging.getLogger(__name__)


def _deduplicate_tag_ids(tag_ids: list[UUID] | None) -> list[UUID]:
    if not tag_ids:
        return []

    return list(dict.fromkeys(tag_ids))


def _deduplicate_linked_note_ids(linked_note_ids: list[UUID] | None) -> list[UUID]:
    if not linked_note_ids:
        return []

    return list(dict.fromkeys(linked_note_ids))


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


def _validate_link_targets(linked_note_ids: list[UUID], user_id: int, source_note_id: UUID, db: Session) -> None:
    if not linked_note_ids:
        return

    if source_note_id in linked_note_ids:
        raise HTTPException(status_code=400, detail="A note cannot be linked to itself")

    valid_targets = (
        db.query(Note.note_id)
        .filter(Note.user_id == user_id, Note.note_id.in_(linked_note_ids))
        .all()
    )
    valid_target_ids = {row.note_id for row in valid_targets}
    if len(valid_target_ids) != len(linked_note_ids):
        raise HTTPException(status_code=400, detail="One or more linked notes are invalid")


def _replace_note_links(source_note_id: UUID, linked_note_ids: list[UUID], db: Session) -> None:
    existing_links = (
        db.query(NoteLink)
        .filter(NoteLink.source_note_id == source_note_id)
        .all()
    )
    existing_targets = {link.target_note_id for link in existing_links}
    desired_targets = set(linked_note_ids)

    for link in existing_links:
        if link.target_note_id not in desired_targets:
            db.delete(link)

    for target_note_id in desired_targets - existing_targets:
        db.add(
            NoteLink(
                source_note_id=source_note_id,
                target_note_id=target_note_id,
            )
        )


async def save_note(note_payload: SaveNoteRequest, current_user: dict, db: Session):
    user_id = extract_user_id_from_token(current_user)
    selected_tag_ids = _deduplicate_tag_ids(note_payload.tag_ids)
    tags_by_id = _load_user_tags_by_ids(selected_tag_ids, user_id, db)
    selected_tags = [tags_by_id[tag_id] for tag_id in selected_tag_ids]
    should_sync_links = "linked_note_ids" in note_payload.model_fields_set
    selected_linked_note_ids = _deduplicate_linked_note_ids(note_payload.linked_note_ids if should_sync_links else [])

    try:
        if note_payload.note_id is None:
            new_note = Note(
                user_id=user_id,
                title=note_payload.title,
                content=note_payload.content,
            )
            new_note.tags = selected_tags
            db.add(new_note)
            db.flush()

            if should_sync_links:
                _validate_link_targets(selected_linked_note_ids, user_id, new_note.note_id, db)
                _replace_note_links(new_note.note_id, selected_linked_note_ids, db)

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

        if should_sync_links:
            _validate_link_targets(selected_linked_note_ids, user_id, existing_note.note_id, db)
            _replace_note_links(existing_note.note_id, selected_linked_note_ids, db)

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

    except IntegrityError:
        db.rollback()
        logger.exception("Integrity error while saving note links for user_id=%s", user_id)
        raise HTTPException(status_code=400, detail="Unable to save note links")

    except SQLAlchemyError as db_exc:
        db.rollback()
        logger.exception("Database error while saving note for user_id=%s", user_id)
        raise HTTPException(
            status_code=500,
            detail="Database error while saving note. Please verify note_links schema.",
        ) from db_exc

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


async def search_notes_for_links(
    current_user: dict,
    db: Session,
    q: str = "",
    limit: int = 10,
    exclude_note_id: UUID | None = None,
):
    user_id = extract_user_id_from_token(current_user)
    safe_limit = max(1, min(limit, 25))
    normalized_query = q.strip().lower()

    try:
        notes_query = db.query(Note).filter(Note.user_id == user_id)
        if exclude_note_id is not None:
            notes_query = notes_query.filter(Note.note_id != exclude_note_id)

        notes = (
            notes_query
            .order_by(func.coalesce(Note.updated_at, Note.created_at).desc())
            .limit(150)
            .all()
        )

        results: list[dict] = []
        for note in notes:
            note_title = _extract_plain_text(note.title, "Untitled Note")
            if normalized_query and normalized_query not in note_title.lower():
                continue

            results.append(
                {
                    "note_id": note.note_id,
                    "title": note_title,
                }
            )

            if len(results) >= safe_limit:
                break

        return results

    except Exception:
        logger.exception("Unexpected error while searching notes for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Internal Server Error")
