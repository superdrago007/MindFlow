import logging
from fastapi import APIRouter, Depends

from app.schemas.Ask_schema import AskRequest, AskResponse
from app.utils.auth_utils import extract_username_from_token, get_current_user



logger = logging.getLogger("ask_routes")

ask_router = APIRouter(prefix="/ask", tags=["Ask"])


@ask_router.post("/ask", response_model=AskResponse)
async def ask_question(ask_schema: AskRequest, current_user: dict = Depends(get_current_user)):
    logger.info("Received a question request")
    user_id = extract_username_from_token(current_user)
    # Placeholder for the actual implementation of the ask_question function
    return {
        "message": (
            "This is a placeholder for the ask_question endpoint "
            f"for user id: {user_id} and question: {ask_schema.question}"
        )
    }
