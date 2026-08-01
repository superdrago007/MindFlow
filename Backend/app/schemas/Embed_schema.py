from pydantic import BaseModel, Field
from sqlalchemy import UUID
from typing import Any, Literal, Optional

class EmbedRequest(BaseModel):
    note_id: UUID
    user_id: UUID 
    title: dict[str, Any]
    content: dict[str, Any]

class EmbedResponse(BaseModel):
    message: str = Field(str, description="A message indicating the result of the embedding operation")