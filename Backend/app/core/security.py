import bcrypt

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