from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator,Field


class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    username: str
    email: Optional[EmailStr] = None

class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str 
    
class SignupResponse(BaseModel):
    user_id: int
    full_name: Optional[str]
    username: str
    email: Optional[str]
    is_active: bool

