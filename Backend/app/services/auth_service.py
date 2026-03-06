import logging
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from app.models.Refresh_Token_Model import Refresh_Token
from app.models.User_Model import User

# Setup logging configuration (usually done in your main.py or a config file)
logger = logging.getLogger(__name__)


def _upsert_refresh_token(db: Session, user_id: int, refresh_token: str, refresh_expires: int) -> None:
    existing_refresh = db.query(Refresh_Token).filter(Refresh_Token.user_id == user_id).first()

    if existing_refresh:
        logger.info(f"Updating existing refresh token for user_id: {user_id}")
        existing_refresh.refresh_token = refresh_token
        existing_refresh.expires_at = datetime.utcnow() + timedelta(seconds=refresh_expires)
        db.merge(existing_refresh)
        return

    logger.info(f"Creating new refresh token for user_id: {user_id}")
    new_refresh = Refresh_Token(
        user_id=user_id,
        refresh_token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(seconds=refresh_expires),
    )
    db.add(new_refresh)


async def signup_user(user, db: Session):
    logger.info(f"Signup attempt initiated for username: {user.username}")

    try:
        # 1. Check if Username already exists
        logger.debug(f"Checking if username '{user.username}' exists in database.")
        existing_username = db.query(User).filter(User.username == user.username).first()
        if existing_username:
            logger.warning(f"Signup failed: Username '{user.username}' is already taken.")
            raise HTTPException(status_code=400, detail="Username already taken")

        # 2. Check if Email already exists
        if user.email:
            logger.debug(f"Checking if email '{user.email}' exists in database.")
            existing_email = db.query(User).filter(User.email == user.email).first()
            if existing_email:
                logger.warning(f"Signup failed: Email '{user.email}' is already registered.")
                raise HTTPException(status_code=400, detail="Email already registered")
        else:
            logger.debug("No email provided for this user; skipping email unique check.")

        # 3. Hash the password
        logger.debug("Hashing user password.")
        hashed_pw = hash_password(user.password)

        # 4. Create the new User object
        new_user = User(
            full_name=user.full_name,
            username=user.username,
            email=user.email,
            password_hash=hashed_pw,
            is_active=True,
        )

        # 5. Save to database
        logger.debug("Attempting to add new user and refresh token to database session.")
        db.add(new_user)
        db.flush()  # Generate the user_id before using it

        logger.info(f"Committing new user '{user.username}' to the database.")

        # 6. Generate tokens
        logger.debug(f"Generating access and refresh tokens for user_id: {new_user.user_id}")
        token_data = {"sub": str(new_user.user_id), "username": new_user.username}
        access_token, access_expires = create_access_token(token_data)
        refresh_token, refresh_expires = create_refresh_token(token_data)

        _upsert_refresh_token(db, new_user.user_id, refresh_token, refresh_expires)

        db.commit()
        db.refresh(new_user)
        logger.info(f"User created successfully. Assigned user_id: {new_user.user_id}")

        return {
            "username": new_user.username,
            "role": new_user.user_role,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "is_active": new_user.is_active,
            "profile_pic": new_user.profile_pic,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "access_token_expires_in": access_expires,
            "refresh_token_expires_in": refresh_expires,
        }

    except HTTPException as http_exc:
        logger.error(f"HTTP Error during signup: {http_exc.detail}")
        db.rollback()
        raise http_exc

    except Exception as e:
        logger.critical(f"Unexpected error during signup for {user.username}: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def login_user(user, db: Session):
    logger.info(f"Attempting login for user: {user.username}")

    try:
        # Find the user in the database
        db_user = db.query(User).filter(User.username == user.username).first()

        if not db_user:
            logger.warning(f"Login failed: User '{user.username}' not found.")
            raise HTTPException(status_code=400, detail="Invalid username or password")

        # Check if the password matches (assuming we have a method to verify)
        if not verify_password(user.password, db_user.password_hash):
            logger.warning(f"Login failed: Incorrect password for user '{user.username}'.")
            raise HTTPException(status_code=400, detail="Invalid username or password")

        logger.info(f"Login successful for user: {user.username}")

        # Generate tokens
        logger.debug(f"Generating access and refresh tokens for user_id: {db_user.user_id}")
        token_data = {"sub": str(db_user.user_id), "username": db_user.username}
        access_token, access_expires = create_access_token(token_data)
        refresh_token, refresh_expires = create_refresh_token(token_data)

        _upsert_refresh_token(db, db_user.user_id, refresh_token, refresh_expires)
        db.commit()

        return {
            "username": db_user.username,
            "email": db_user.email,
            "role": db_user.user_role,
            "profile_pic": db_user.profile_pic,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "access_token_expires_in": access_expires,
            "refresh_token_expires_in": refresh_expires,
        }

    except HTTPException as http_exc:
        logger.error(f"HTTP Error during login: {http_exc.detail}")
        db.rollback()
        raise http_exc

    except Exception as e:
        logger.critical(f"Unexpected error during login for {user.username}: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def refresh_user_token(refresh_token: str, db: Session):
    logger.info("Refresh token request received.")

    try:
        payload = verify_refresh_token(refresh_token)
        if payload is None:
            logger.warning("Refresh failed: invalid or expired JWT.")
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        user_id_str = payload.get("sub")
        username = payload.get("username")

        if not user_id_str or not username:
            logger.warning("Refresh failed: missing token claims.")
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        try:
            user_id = int(user_id_str)
        except ValueError:
            logger.warning("Refresh failed: malformed user id in token.")
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        existing_refresh = db.query(Refresh_Token).filter(Refresh_Token.user_id == user_id).first()
        if not existing_refresh:
            logger.warning(f"Refresh failed: no persisted refresh token for user_id {user_id}.")
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        if existing_refresh.refresh_token != refresh_token:
            logger.warning(f"Refresh failed: refresh token mismatch for user_id {user_id}.")
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        if existing_refresh.expires_at <= datetime.utcnow():
            logger.warning(f"Refresh failed: persisted refresh token expired for user_id {user_id}.")
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        token_data = {"sub": str(user_id), "username": username}
        access_token, access_expires = create_access_token(token_data)
        new_refresh_token, refresh_expires = create_refresh_token(token_data)

        existing_refresh.refresh_token = new_refresh_token
        existing_refresh.expires_at = datetime.utcnow() + timedelta(seconds=refresh_expires)
        db.merge(existing_refresh)
        db.commit()

        logger.info(f"Refresh token rotation successful for user_id {user_id}.")
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "access_token_expires_in": access_expires,
            "refresh_token_expires_in": refresh_expires,
        }

    except HTTPException as http_exc:
        logger.error(f"HTTP Error during refresh: {http_exc.detail}")
        db.rollback()
        raise http_exc

    except Exception as e:
        logger.critical(f"Unexpected error during refresh: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal Server Error")
