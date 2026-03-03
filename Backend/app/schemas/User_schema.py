from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator,Field


class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    username: str
    email: Optional[str]
    role: str
    profile_pic: Optional[str]
    access_token: Optional[str]
    refresh_token: Optional[str]
    access_token_expires_in: Optional[int]
    refresh_token_expires_in: Optional[int]

class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str 
    
class SignupResponse(BaseModel):
    username: str
    role : str
    full_name: Optional[str]
    email: Optional[str]
    is_active: bool
    profile_pic: Optional[str]
    access_token: Optional[str]
    refresh_token: Optional[str]
    access_token_expires_in: Optional[int]
    refresh_token_expires_in: Optional[int]

