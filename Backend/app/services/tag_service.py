import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.Tag_Model import Tag
from app.schemas.Tag_schema import CreateTagRequest, UpdateTagRequest
from app.utils.auth_utils import extract_user_id_from_token

logger = logging.getLogger(__name__)


def _serialize_tag(tag: Tag) -> dict:
    return {
        "tag_id": tag.tag_id,
        "name": tag.name,
        "color": tag.color,
        "description": tag.description,
        "created_at": tag.created_at,
    }


def _is_duplicate_name_error(error: IntegrityError) -> bool:
    original_error = getattr(error, "orig", None)
    message = str(original_error).lower() if original_error is not None else str(error).lower()
    return "ux_tags_user_id_lower_name" in message or "duplicate key value violates unique constraint" in message


async def list_user_tags(current_user: dict, db: Session):
    user_id = extract_user_id_from_token(current_user)

    try:
        tags = (
            db.query(Tag)
            .filter(Tag.user_id == user_id)
            .order_by(Tag.name.asc())
            .all()
        )
        return [_serialize_tag(tag) for tag in tags]

    except Exception:
        logger.exception("Unexpected error while listing tags for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def create_user_tag(payload: CreateTagRequest, current_user: dict, db: Session):
    user_id = extract_user_id_from_token(current_user)

    try:
        new_tag = Tag(
            user_id=user_id,
            name=payload.name,
            color=payload.color,
            description=payload.description,
        )
        db.add(new_tag)
        db.commit()
        db.refresh(new_tag)

        return _serialize_tag(new_tag)

    except IntegrityError as integrity_error:
        db.rollback()
        if _is_duplicate_name_error(integrity_error):
            raise HTTPException(status_code=409, detail="Tag name already exists")

        logger.exception("Integrity error while creating tag for user_id=%s", user_id)
        raise HTTPException(status_code=400, detail="Unable to create tag")

    except HTTPException as http_exc:
        db.rollback()
        raise http_exc

    except Exception:
        db.rollback()
        logger.exception("Unexpected error while creating tag for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def update_user_tag(tag_id: UUID, payload: UpdateTagRequest, current_user: dict, db: Session):
    user_id = extract_user_id_from_token(current_user)
    update_fields = payload.model_dump(exclude_unset=True)

    if not update_fields:
        raise HTTPException(status_code=400, detail="At least one field must be provided")

    try:
        tag = db.query(Tag).filter(Tag.tag_id == tag_id, Tag.user_id == user_id).first()
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        if "name" in update_fields:
            tag.name = update_fields["name"]

        if "color" in update_fields:
            tag.color = update_fields["color"]

        if "description" in update_fields:
            tag.description = update_fields["description"]

        db.commit()
        db.refresh(tag)

        return _serialize_tag(tag)

    except IntegrityError as integrity_error:
        db.rollback()
        if _is_duplicate_name_error(integrity_error):
            raise HTTPException(status_code=409, detail="Tag name already exists")

        logger.exception("Integrity error while updating tag_id=%s for user_id=%s", tag_id, user_id)
        raise HTTPException(status_code=400, detail="Unable to update tag")

    except HTTPException as http_exc:
        db.rollback()
        raise http_exc

    except Exception:
        db.rollback()
        logger.exception("Unexpected error while updating tag_id=%s for user_id=%s", tag_id, user_id)
        raise HTTPException(status_code=500, detail="Internal Server Error")
