import logging
import time
from fastapi import APIRouter, Depends
from app.db.database import get_db
from app.services.auth_service import signup_user,login_user
from sqlalchemy.orm import Session
from app.schemas.User_schema import LoginRequest, SignupRequest, SignupResponse, LoginResponse

# Initialize logger for the auth router
logger = logging.getLogger("auth_routes")

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

@auth_router.post("/login")
async def login(user_schema: LoginRequest,  db: Session = Depends(get_db)):
    logger.info(f"Login attempt received for user: {user_schema.username}")
    try:
        response = await login_user(user_schema, db)
        logger.info(f"Login successful for user: {user_schema.username}")
        return response

    except Exception as e:
        logger.error(f"Login failed for user: {user_schema.username}, error: {e}")
        raise e

@auth_router.post("/signup")
async def signup(user_signup_schema: SignupRequest, db: Session = Depends(get_db)):
    """
    Handles user registration.
    Logs the start time and completion time for performance monitoring.
    """
    start_time = time.time()
    
    logger.info(f"POST /auth/signup - User: {user_signup_schema.username}")
    logger.debug(f"Payload received: {user_signup_schema.model_dump(exclude={'password'})}")

    try:
        response = await signup_user(user_signup_schema, db)
        
        duration = time.time() - start_time
        logger.info(f"SUCCESS: User {user_signup_schema.username} created in {duration:.2f}s")
        return response

    except Exception as e:
        # We don't need to 'raise' here because signup_user already handles it,
        # but we catch it just to log the failure at the route level.
        duration = time.time() - start_time
        logger.error(f"FAILED: Signup for {user_signup_schema.username} after {duration:.2f}s")
        raise e