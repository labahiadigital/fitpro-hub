from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Tuple
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, ValidationError
import secrets
import re

from app.core.config import settings


# Password hashing configuration using bcrypt
# bcrypt is considered secure and is the recommended choice
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Recommended: 12 rounds for good security/performance balance
)

# JWT Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days

# Password validation regex
PASSWORD_MIN_LENGTH = 8
PASSWORD_PATTERN = re.compile(r'^.{8,}$')  # At least 8 characters


class TokenPayload(BaseModel):
    """
    JWT Token payload structure.
    Following JWT best practices with standard claims.
    """
    sub: str  # Subject: user_id (UUID as string)
    email: Optional[str] = None
    workspace_id: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None  # Expiration time
    iat: Optional[int] = None  # Issued at
    type: str = "access"  # Token type: "access" or "refresh"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Uses constant-time comparison to prevent timing attacks.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # If verification fails for any reason, return False
        # This prevents information leakage about the hash format
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    Returns a secure hash suitable for storage.
    """
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets minimum security requirements.
    Returns (is_valid, error_message).
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres"
    
    # Additional checks can be added here:
    # - Require uppercase/lowercase
    # - Require numbers
    # - Require special characters
    # - Check against common passwords
    
    return True, ""


def create_access_token(
    user_id: str,
    email: str,
    workspace_id: Optional[str] = None,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    if workspace_id:
        to_encode["workspace_id"] = workspace_id
    if role:
        to_encode["role"] = role
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    user_id: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT refresh token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "sub": user_id,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_tokens(
    user_id: str,
    email: str,
    workspace_id: Optional[str] = None,
    role: Optional[str] = None
) -> Tuple[str, str, int]:
    """Create both access and refresh tokens. Returns (access_token, refresh_token, expires_in)."""
    access_token = create_access_token(user_id, email, workspace_id, role)
    refresh_token = create_refresh_token(user_id)
    expires_in = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # in seconds
    return access_token, refresh_token, expires_in


def decode_token(token: str) -> Optional[TokenPayload]:
    """
    Decode and validate a JWT token.
    Performs full validation including signature and expiration.
    """
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[ALGORITHM],
            options={
                "verify_signature": True,
                "verify_exp": True,  # Verify expiration
                "verify_iat": True,  # Verify issued at
                "require_exp": True,  # Require expiration claim
            }
        )
        return TokenPayload(**payload)
    except JWTError:
        return None
    except ValidationError:
        # Pydantic validation failed
        return None


def decode_access_token(token: str) -> Optional[TokenPayload]:
    """
    Decode and validate an access token.
    Only returns payload if token is valid AND is an access token.
    """
    payload = decode_token(token)
    if payload and payload.type == "access":
        return payload
    return None


def decode_refresh_token(token: str) -> Optional[TokenPayload]:
    """
    Decode and validate a refresh token.
    Only returns payload if token is valid AND is a refresh token.
    """
    payload = decode_token(token)
    if payload and payload.type == "refresh":
        return payload
    return None


def generate_verification_token() -> str:
    """Generate a secure random token for email verification."""
    return secrets.token_urlsafe(32)


def generate_password_reset_token() -> str:
    """Generate a secure random token for password reset."""
    return secrets.token_urlsafe(32)


# Legacy: Keep for backward compatibility during migration
def decode_supabase_token(token: str) -> Optional[dict]:
    """Decode Supabase JWT token (legacy, for migration)."""
    # First try our own token format
    payload = decode_access_token(token)
    if payload:
        return payload.model_dump()
    
    # Fallback to Supabase token format (for migration)
    try:
        if settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[ALGORITHM],
                options={"verify_aud": False}
            )
            return payload
    except JWTError:
        pass
    
    return None

