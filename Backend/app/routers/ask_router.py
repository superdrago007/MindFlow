import logging

from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.config.db_config import get_db
from app.schemas.Ask_schema import AskRequest, AskResponse
from app.services.qa_service import ask_question
from app.utils.auth_utils import extract_user_id_from_token, get_current_user

logger = logging.getLogger("ask_routes")

ask_router = APIRouter(prefix="/ask", tags=["Ask"])


@ask_router.post("/ask", response_model=AskResponse)
async def ask_question_endpoint(
    ask_schema: AskRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Received a question request")

    # Was extract_username_from_token — a username can't filter
    # note_embeddings.user_id, which is an int. Needed the id, not the name.
    user_id = extract_user_id_from_token(current_user)

    # ask_question is synchronous end to end (DB queries + the Gemini call),
    # matching the rest of the app's sync SQLAlchemy layer. Calling it
    # directly from this async handler would block the event loop for the
    # entire round trip — run_in_threadpool is the same fix note_router
    # already uses for embedding.
    result = await run_in_threadpool(ask_question, db, user_id, ask_schema.question)

    return AskResponse(message=result["message"], sources=result["sources"])