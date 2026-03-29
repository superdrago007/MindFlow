import hashlib
import hmac
import logging
import secrets

from fastapi import HTTPException, status
from redis.exceptions import RedisError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config.redis_config import redis_client
from app.core.security import hash_password
from app.models.User_Model import User
from app.utils.email_utils import send_email

logger = logging.getLogger(__name__)

OTP_TTL_SECONDS = 60
RESET_TOKEN_TTL_SECONDS = 600
MAX_OTP_ATTEMPTS = 5
LOCKOUT_BASE_SECONDS = 300
LOCKOUT_MAX_SECONDS = 3600

GENERIC_OTP_MESSAGE = "If the email is registered, an OTP has been sent."
WRONG_OTP_MESSAGE = "Wrong OTP"
RESET_TOKEN_INVALID_MESSAGE = "Invalid or expired reset token."
LOCKED_OTP_MESSAGE = "Too many failed attempts. Try again later."


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _otp_key(user_id: int) -> str:
    return f"fp:otp:{user_id}"


def _otp_attempts_key(user_id: int) -> str:
    return f"fp:otp_attempts:{user_id}"


def _otp_hard_lock_key(user_id: int) -> str:
    return f"fp:otp_hard_lock:{user_id}"


def _otp_lock_level_key(user_id: int) -> str:
    return f"fp:otp_lock_level:{user_id}"


def _reset_token_key(user_id: int) -> str:
    return f"fp:reset:{user_id}"


def _resend_lock_key(email: str) -> str:
    return f"fp:otp_lock:{_hash_value(email)}"


def _find_user_by_email(db: Session, normalized_email: str) -> User | None:
    return db.query(User).filter(func.lower(User.email) == normalized_email).first()


def _active_lock_ttl_seconds(user_id: int) -> int:
    ttl = redis_client.ttl(_otp_hard_lock_key(user_id))
    return ttl if isinstance(ttl, int) and ttl > 0 else 0


def _lock_duration_seconds_for_level(level: int) -> int:
    duration = LOCKOUT_BASE_SECONDS
    for _ in range(max(level - 1, 0)):
        duration = min(duration * 2, LOCKOUT_MAX_SECONDS)
    return duration


def _lock_metadata(lock_seconds: int) -> dict[str, str | bool | int]:
    return {
        "message": LOCKED_OTP_MESSAGE,
        "is_locked": True,
        "lock_remaining_seconds": lock_seconds,
    }


def _apply_progressive_lock(user_id: int, normalized_email: str) -> int:
    current_level = int(redis_client.get(_otp_lock_level_key(user_id)) or "0")
    next_level = current_level + 1
    lock_seconds = _lock_duration_seconds_for_level(next_level)

    redis_client.set(_otp_lock_level_key(user_id), str(next_level))
    redis_client.setex(_otp_hard_lock_key(user_id), lock_seconds, "1")
    redis_client.delete(_otp_key(user_id))
    redis_client.delete(_otp_attempts_key(user_id))
    redis_client.delete(_resend_lock_key(normalized_email))

    logger.warning(
        "Applied OTP lockout for user_id=%s level=%s lock_seconds=%s",
        user_id,
        next_level,
        lock_seconds,
    )
    return lock_seconds


async def verify_email_for_forgot_password(email: str, db: Session) -> dict[str, str]:
    """
    Existence is checked for audit/logging while response stays generic.
    """
    normalized_email = _normalize_email(email)
    user = _find_user_by_email(db, normalized_email)

    if user:
        logger.info("Password reset verifyEmail requested for existing user_id=%s", user.user_id)
    else:
        logger.info("Password reset verifyEmail requested for unknown email=%s", normalized_email)

    return {"message": GENERIC_OTP_MESSAGE}


async def send_otp_for_forgot_password(email: str, db: Session) -> dict[str, str | int | bool | None]:
    normalized_email = _normalize_email(email)
    lock_key = _resend_lock_key(normalized_email)

    try:
        user = _find_user_by_email(db, normalized_email)

        if not user:
            resend_ttl = redis_client.ttl(lock_key)
            if resend_ttl and resend_ttl > 0:
                return {
                    "message": GENERIC_OTP_MESSAGE,
                    "resend_after_seconds": resend_ttl,
                    "is_locked": False,
                    "lock_remaining_seconds": None,
                }

            redis_client.setex(lock_key, OTP_TTL_SECONDS, "1")
            logger.info("OTP generation skipped for unknown email=%s", normalized_email)
            return {
                "message": GENERIC_OTP_MESSAGE,
                "resend_after_seconds": OTP_TTL_SECONDS,
                "is_locked": False,
                "lock_remaining_seconds": None,
            }

        active_lock_seconds = _active_lock_ttl_seconds(user.user_id)
        if active_lock_seconds > 0:
            lock_response = _lock_metadata(active_lock_seconds)
            return {
                "message": str(lock_response["message"]),
                "resend_after_seconds": active_lock_seconds,
                "is_locked": True,
                "lock_remaining_seconds": active_lock_seconds,
            }

        resend_ttl = redis_client.ttl(lock_key)
        if resend_ttl and resend_ttl > 0:
            return {
                "message": GENERIC_OTP_MESSAGE,
                "resend_after_seconds": resend_ttl,
                "is_locked": False,
                "lock_remaining_seconds": None,
            }

        redis_client.setex(lock_key, OTP_TTL_SECONDS, "1")

        otp = f"{secrets.randbelow(1_000_000):06d}"
        otp_hash = _hash_value(otp)

        redis_client.setex(_otp_key(user.user_id), OTP_TTL_SECONDS, otp_hash)
        redis_client.setex(_otp_attempts_key(user.user_id), OTP_TTL_SECONDS, "0")
        redis_client.delete(_reset_token_key(user.user_id))

        send_email(
            recipient=user.email,
            subject="MindFlow Password Reset OTP",
            body=(
                "Your MindFlow OTP is "
                f"{otp}. It expires in {OTP_TTL_SECONDS} seconds. "
                "If you did not request this, please ignore this email."
            ),
        )

        logger.info("OTP generated for user_id=%s", user.user_id)
        return {
            "message": GENERIC_OTP_MESSAGE,
            "resend_after_seconds": OTP_TTL_SECONDS,
            "is_locked": False,
            "lock_remaining_seconds": None,
        }
    except RedisError as redis_exc:
        logger.exception("Redis error while sending OTP: %s", redis_exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process request right now.",
        ) from redis_exc


async def verify_otp_for_forgot_password(email: str, otp: str, db: Session) -> dict[str, str | int]:
    normalized_email = _normalize_email(email)
    user = _find_user_by_email(db, normalized_email)

    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=WRONG_OTP_MESSAGE)

    try:
        active_lock_seconds = _active_lock_ttl_seconds(user.user_id)
        if active_lock_seconds > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=_lock_metadata(active_lock_seconds),
            )

        attempts_key = _otp_attempts_key(user.user_id)
        attempts = int(redis_client.get(attempts_key) or "0")

        if attempts >= MAX_OTP_ATTEMPTS:
            lock_seconds = _apply_progressive_lock(user.user_id, normalized_email)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=_lock_metadata(lock_seconds),
            )

        stored_otp_hash = redis_client.get(_otp_key(user.user_id))
        if not stored_otp_hash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=WRONG_OTP_MESSAGE)

        provided_otp_hash = _hash_value(otp)
        if not hmac.compare_digest(stored_otp_hash, provided_otp_hash):
            next_attempts = redis_client.incr(attempts_key)
            if next_attempts == 1:
                redis_client.expire(attempts_key, OTP_TTL_SECONDS)

            if next_attempts >= MAX_OTP_ATTEMPTS:
                lock_seconds = _apply_progressive_lock(user.user_id, normalized_email)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=_lock_metadata(lock_seconds),
                )

            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=WRONG_OTP_MESSAGE)

        reset_token = secrets.token_urlsafe(32)
        reset_token_hash = _hash_value(reset_token)

        redis_client.setex(_reset_token_key(user.user_id), RESET_TOKEN_TTL_SECONDS, reset_token_hash)
        redis_client.delete(_otp_key(user.user_id))
        redis_client.delete(attempts_key)
        redis_client.delete(_resend_lock_key(normalized_email))

        logger.info("OTP verification succeeded for user_id=%s", user.user_id)
        return {
            "message": "OTP verified.",
            "reset_token": reset_token,
            "expires_in": RESET_TOKEN_TTL_SECONDS,
        }
    except RedisError as redis_exc:
        logger.exception("Redis error while verifying OTP: %s", redis_exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process request right now.",
        ) from redis_exc


async def reset_password_with_token(email: str, reset_token: str, new_password: str, db: Session) -> dict[str, str]:
    normalized_email = _normalize_email(email)
    user = _find_user_by_email(db, normalized_email)

    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=RESET_TOKEN_INVALID_MESSAGE)

    try:
        stored_token_hash = redis_client.get(_reset_token_key(user.user_id))
        if not stored_token_hash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=RESET_TOKEN_INVALID_MESSAGE)

        provided_token_hash = _hash_value(reset_token)
        if not hmac.compare_digest(stored_token_hash, provided_token_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=RESET_TOKEN_INVALID_MESSAGE)

        user.password_hash = hash_password(new_password)
        db.add(user)
        db.commit()

        redis_client.delete(_reset_token_key(user.user_id))
        redis_client.delete(_otp_hard_lock_key(user.user_id))
        redis_client.delete(_otp_lock_level_key(user.user_id))
        redis_client.delete(_otp_attempts_key(user.user_id))
        redis_client.delete(_otp_key(user.user_id))
        redis_client.delete(_resend_lock_key(normalized_email))

        send_email(
            recipient=user.email,
            subject="MindFlow Password Updated",
            body=(
                "Your MindFlow password was changed successfully. "
                "If you did not perform this action, contact support immediately."
            ),
        )

        logger.info("Password reset successful for user_id=%s", user.user_id)
        return {"message": "Password reset successful."}
    except HTTPException:
        raise
    except RedisError as redis_exc:
        logger.exception("Redis error while resetting password: %s", redis_exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process request right now.",
        ) from redis_exc
    except Exception as exc:
        db.rollback()
        logger.exception("Unexpected error while resetting password: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error",
        ) from exc
