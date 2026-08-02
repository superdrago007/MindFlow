from pydantic import BaseModel, Field

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class SourceSchema(BaseModel):
    note_id: str
    title: str
 
 
class AskResponse(BaseModel):
    message: str
    sources: list[SourceSchema] = []