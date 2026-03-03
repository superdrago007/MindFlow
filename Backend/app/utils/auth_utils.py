"""
Authentication utility functions for token verification and user extraction from tokens.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from app.core.security import verify_access_token, verify_refresh_token

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthCredentials = Depends(security)):
    """
    Dependency to extract and verify the current user from the access token.
    
    Usage:
        @router.get("/profile")
        async def get_profile(current_user = Depends(get_current_user)):
            return {"user_id": current_user["sub"], "username": current_user["username"]}
    
    Args:
        credentials: HTTP Bearer token from Authorization header
    
    Returns:
        Decoded token payload containing user info
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
    payload = verify_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


async def get_current_user_refresh(credentials: HTTPAuthCredentials = Depends(security)):
    """
    Dependency to extract and verify the current user from the refresh token.
    
    Usage:
        @router.post("/refresh-token")
        async def refresh_token(current_user = Depends(get_current_user_refresh)):
            # Generate new access token
            token_data = {"sub": current_user["sub"], "username": current_user["username"]}
            new_access_token, expires = create_access_token(token_data)
            return {"access_token": new_access_token, "expires_in": expires}
    
    Args:
        credentials: HTTP Bearer token from Authorization header
    
    Returns:
        Decoded token payload containing user info
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
    payload = verify_refresh_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


def extract_user_id_from_token(payload: dict) -> int:
    """
    Extract user ID from token payload.
    
    Args:
        payload: Decoded token payload
    
    Returns:
        User ID as integer
    """
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
        )
    
    try:
        return int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user ID format error",
        )


def extract_username_from_token(payload: dict) -> str:
    """
    Extract username from token payload.
    
    Args:
        payload: Decoded token payload
    
    Returns:
        Username as string
    """
    username = payload.get("username")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing username",
        )
    
    return username
