import bcrypt
import jwt as pyjwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# JWT Configuration
SECRET_KEY = "SECRET-KEY-iudbcidsbfisdcjdsvcuglvd"  # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


def hash_password(plain_password: str) -> str:
    """
    Hashes a plain text password using bcrypt.
    Returns the hashed password as a string.
    """
    # bcrypt requires bytes, so we encode the string
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    
    # Return the hashed password as a string (decode from bytes)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the stored hashed password.
    Returns True if correct, False otherwise.
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> tuple[str, int]:
    """
    Creates a JWT access token.
    
    Args:
        data: Dictionary containing token claims (e.g., {"sub": user_id})
        expires_delta: Optional custom expiration time
    
    Returns:
        Tuple of (token_string, expires_in_seconds)
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = pyjwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    expires_in = int(expires_delta.total_seconds()) if expires_delta else ACCESS_TOKEN_EXPIRE_MINUTES * 60
    
    return encoded_jwt, expires_in


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> tuple[str, int]:
    """
    Creates a JWT refresh token.
    
    Args:
        data: Dictionary containing token claims (e.g., {"sub": user_id})
        expires_delta: Optional custom expiration time
    
    Returns:
        Tuple of (token_string, expires_in_seconds)
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = pyjwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    expires_in = int(expires_delta.total_seconds()) if expires_delta else REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    
    return encoded_jwt, expires_in


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies and decodes an access token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token data if valid, None if invalid or expired
    """
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check if token type is 'access'
        if payload.get("type") != "access":
            return None
            
        return payload
    except pyjwt.ExpiredSignatureError:
        return None
    except pyjwt.InvalidTokenError:
        return None


def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies and decodes a refresh token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token data if valid, None if invalid or expired
    """
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check if token type is 'refresh'
        if payload.get("type") != "refresh":
            return None
            
        return payload
    except pyjwt.ExpiredSignatureError:
        return None
    except pyjwt.InvalidTokenError:
        return None