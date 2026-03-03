import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.core.security import hash_password, verify_password
from app.models.User_Model import User

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
        logger.debug("Attempting to add new user to database session.")
        db.add(new_user)
        
        logger.info(f"Committing new user '{user.username}' to the database.")
        db.commit()
        
        db.refresh(new_user)
        logger.info(f"User created successfully. Assigned user_id: {new_user.user_id}")

        # 6. Return response
        return {
            "user_id": new_user.user_id,
            "full_name": new_user.full_name,
            "username": new_user.username,
            "email": new_user.email,
            "is_active": new_user.is_active,
            "created_at": new_user.created_at
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
        return {
            "username": db_user.username,
            "auth_token": "to be implemented",
            "refresh_token": "to be implemented"
        }

    except HTTPException as http_exc:
        logger.error(f"HTTP Error during login: {http_exc.detail}")
        raise http_exc

    except Exception as e:
        logger.critical(f"Unexpected error during login for {user.username}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")