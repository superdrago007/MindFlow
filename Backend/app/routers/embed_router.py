import logging
from fastapi import APIRouter, Depends

from Backend.app.services.embedding_service import embed_note_in_background
from app.schemas.Embed_schema import EmbedRequest, EmbedResponse
from app.utils.auth_utils import extract_user_id_from_token, extract_username_from_token, get_current_user



logger = logging.getLogger("embed_routes")

embed_router = APIRouter(prefix="/embed", tags=["Embed"])


@embed_router.post("", response_model=EmbedResponse)
async def embed_question(embed_schema: EmbedRequest, current_user: dict = Depends(get_current_user)):
    logger.info("Received an embedding request")
    user_id = extract_user_id_from_token(current_user)

    embed_note_in_background(embed_schema.note_id, user_id, embed_schema.title, embed_schema.content)

    
