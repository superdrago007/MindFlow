import logging
import time
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from app.config.db_config import get_db
from app.services.auth_service import login_user, refresh_user_token, signup_user
from sqlalchemy.orm import Session
from app.schemas.User_schema import LoginRequest, LoginResponse, RefreshResponse, SignupRequest, SignupResponse

# Initialize logger for the auth router
logger = logging.getLogger("auth_routes")

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
refresh_security = HTTPBearer(auto_error=False)

@auth_router.post("/login", response_model=LoginResponse)
async def login(user_schema: LoginRequest,  db: Session = Depends(get_db)):
    logger.info(f"Login attempt received for user: {user_schema.username}")
    try:
        response_model = await login_user(user_schema, db)
        logger.info(f"Login successful for user: {user_schema.username}")
        return response_model

    except Exception as e:
        logger.error(f"Login failed for user: {user_schema.username}, error: {e}")
        raise e

@auth_router.post("/signup", response_model=SignupResponse)
async def signup(user_signup_schema: SignupRequest, db: Session = Depends(get_db)):
    """
    Handles user registration.
    Logs the start time and completion time for performance monitoring.
    """
    start_time = time.time()
    
    logger.info(f"POST /auth/signup - User: {user_signup_schema.username}")
    logger.debug(f"Payload received: {user_signup_schema.model_dump(exclude={'password'})}")

    try:
        response_model = await signup_user(user_signup_schema, db)
        
        duration = time.time() - start_time
        logger.info(f"SUCCESS: User {user_signup_schema.username} created in {duration:.2f}s")
        return response_model

    except Exception as e:
        # We don't need to 'raise' here because signup_user already handles it,
        # but we catch it just to log the failure at the route level.
        duration = time.time() - start_time
        logger.error(f"FAILED: Signup for {user_signup_schema.username} after {duration:.2f}s")
        raise e


@auth_router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(refresh_security),
    db: Session = Depends(get_db),
):
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return await refresh_user_token(credentials.credentials, db)
