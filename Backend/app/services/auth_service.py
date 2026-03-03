import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.models.User_Model import User
from app.models.Refresh_Token_Model import Refresh_Token
from datetime import datetime, timedelta

# Setup logging configuration (usually done in your main.py or a config file)
logger = logging.getLogger(__name__)

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
            is_active=True
        )

        

        # 5. Save to database
        logger.debug("Attempting to add new user and refresh token to database session.")
        db.add(new_user)
        db.flush()  # Generate the user_id before using it
        
        logger.info(f"Committing new user '{user.username}' to the database.")

        # 7. Generate tokens
        logger.debug(f"Generating access and refresh tokens for user_id: {new_user.user_id}")
        logger.info(f"DEBUG: new_user.user_id = {new_user.user_id}, type = {type(new_user.user_id)}")
        
        token_data = {"sub": str(new_user.user_id), "username": new_user.username}
        access_token, access_expires = create_access_token(token_data)
        refresh_token, refresh_expires = create_refresh_token(token_data)

        logger.info(f"DEBUG: Creating Refresh_Token with user_id={new_user.user_id}, refresh_token_length={len(refresh_token)}")
        
        # Check if a refresh token already exists for this user
        existing_refresh = db.query(Refresh_Token).filter(Refresh_Token.user_id == new_user.user_id).first()
        
        if existing_refresh:
            # Update existing refresh token
            logger.info(f"Updating existing refresh token for user_id: {new_user.user_id}")
            existing_refresh.refresh_token = refresh_token
            existing_refresh.expires_at = datetime.utcnow() + timedelta(seconds=refresh_expires)
            db.merge(existing_refresh)
        else:
            # Create new refresh token
            logger.info(f"Creating new refresh token for user_id: {new_user.user_id}")
            new_refresh = Refresh_Token(
                user_id=new_user.user_id,
                refresh_token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(seconds=refresh_expires)
            )
            db.add(new_refresh)
        
        db.commit()
        db.refresh(new_user)
        logger.info(f"User created successfully. Assigned user_id: {new_user.user_id}")

        

        # 6. Return response
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
            "refresh_token_expires_in": refresh_expires
        }

    except HTTPException as http_exc:
        logger.error(f"HTTP Error during signup: {http_exc.detail}")
        db.rollback()
        raise http_exc
        
    except Exception as e:
        # exc_info=True adds the full stack trace to the log for debugging
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
        
        # Check if a refresh token already exists for this user
        existing_refresh = db.query(Refresh_Token).filter(Refresh_Token.user_id == db_user.user_id).first()
        
        if existing_refresh:
            # Update existing refresh token
            logger.info(f"Updating existing refresh token for user_id: {db_user.user_id}")
            existing_refresh.refresh_token = refresh_token
            existing_refresh.expires_at = datetime.utcnow() + timedelta(seconds=refresh_expires)
            db.merge(existing_refresh)
        
        db.commit()

        return {
            "username": db_user.username,
            "email": db_user.email,
            "role": db_user.user_role,
            "profile_pic": db_user.profile_pic,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "access_token_expires_in": access_expires,
            "refresh_token_expires_in": refresh_expires
        }

    except HTTPException as http_exc:
        logger.error(f"HTTP Error during login: {http_exc.detail}")
        raise http_exc

    except Exception as e:
        logger.critical(f"Unexpected error during login for {user.username}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")