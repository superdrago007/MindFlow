from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ForgotPasswordEmailRequest(BaseModel):
    email: EmailStr


class ForgotPasswordSendOtpResponse(BaseModel):
    message: str
    resend_after_seconds: int = Field(default=60, ge=0)
    is_locked: bool = False
    lock_remaining_seconds: Optional[int] = Field(default=None, ge=0)


class ForgotPasswordVerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ForgotPasswordVerifyOtpResponse(BaseModel):
    message: str
    reset_token: str
    expires_in: int


class ForgotPasswordResetRequest(BaseModel):
    email: EmailStr
    reset_token: str = Field(min_length=16)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordGenericResponse(BaseModel):
    message: str
    resend_after_seconds: Optional[int] = None


class ForgotPasswordResetResponse(BaseModel):
    message: str
