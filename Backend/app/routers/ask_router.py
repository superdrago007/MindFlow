import logging
from fastapi import APIRouter
from fastapi.security import HTTPBearer

from app.schemas.Ask_schema import AskRequest



logger = logging.getLogger("ask_routes")

ask_router = APIRouter(prefix="/ask", tags=["Ask"])
refresh_security = HTTPBearer(auto_error=False)

@ask_router.post("/ask")
async def ask_question(ask_schema: AskRequest):
    logger.info("Received a question request")
    # Placeholder for the actual implementation of the ask_question function
    return {"message": f"This is a placeholder for the ask_question endpoint for user id: {ask_schema.user_id} and question: {ask_schema.question}"}