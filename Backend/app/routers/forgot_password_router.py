import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.db_config import get_db
from app.schemas.Forgot_password_schema import (
    ForgotPasswordEmailRequest,
    ForgotPasswordGenericResponse,
    ForgotPasswordResetRequest,
    ForgotPasswordResetResponse,
    ForgotPasswordSendOtpResponse,
    ForgotPasswordVerifyOtpRequest,
    ForgotPasswordVerifyOtpResponse,
)
from app.services.forgot_password_service import (
    reset_password_with_token,
    send_otp_for_forgot_password,
    verify_email_for_forgot_password,
    verify_otp_for_forgot_password,
)

logger = logging.getLogger(__name__)

forgot_password_router = APIRouter(prefix="/forgotPassword", tags=["Forgot Password"])


@forgot_password_router.post("/verifyEmail", response_model=ForgotPasswordGenericResponse)
async def verify_email(payload: ForgotPasswordEmailRequest, db: Session = Depends(get_db)):
    logger.info("POST /forgotPassword/verifyEmail")
    return await verify_email_for_forgot_password(payload.email, db)


@forgot_password_router.post("/sendotp", response_model=ForgotPasswordSendOtpResponse)
async def send_otp(payload: ForgotPasswordEmailRequest, db: Session = Depends(get_db)):
    logger.info("POST /forgotPassword/sendotp")
    return await send_otp_for_forgot_password(payload.email, db)


@forgot_password_router.post("/verifyotp", response_model=ForgotPasswordVerifyOtpResponse)
async def verify_otp(payload: ForgotPasswordVerifyOtpRequest, db: Session = Depends(get_db)):
    logger.info("POST /forgotPassword/verifyotp")
    return await verify_otp_for_forgot_password(payload.email, payload.otp, db)


@forgot_password_router.post("/resetPassword", response_model=ForgotPasswordResetResponse)
async def reset_password(payload: ForgotPasswordResetRequest, db: Session = Depends(get_db)):
    logger.info("POST /forgotPassword/resetPassword")
    return await reset_password_with_token(payload.email, payload.reset_token, payload.new_password, db)
