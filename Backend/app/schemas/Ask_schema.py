from typing import Optional

from pydantic import BaseModel, EmailStr, Field

class AskRequest(BaseModel):
    user_id: str
    question: str = Field(min_length=1, max_length=500)
    