"""Password hashing, application secret checks, and JWT helpers."""

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol, cast

from jose import JWTError, jwt
from passlib.context import CryptContext  # pyright: ignore[reportMissingTypeStubs]

from .schemas import validate_password_strength


ALGORITHM = "HS256"


class PasswordContext(Protocol):
    """Typed interface for the untyped Passlib context."""

    def hash(self, password: str, **kwargs: Any) -> str: ...

    def verify(self, password: str, password_hash: str, **kwargs: Any) -> bool: ...


pwd_context = cast(PasswordContext, CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto"))


def get_jwt_secret() -> str:
    """Return the configured signing secret or reject an unsafe value."""
    secret = os.getenv("JWT_SECRET", "")
    if len(secret) < 32 or secret.lower().startswith(("development-", "replace-", "change-")):
        raise RuntimeError("JWT_SECRET must be a unique secret of at least 32 characters")
    return secret


def validate_app_secrets() -> None:
    """Reject missing or insecure application credentials at startup."""
    get_jwt_secret()
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if admin_password and (len(admin_password) < 12 or admin_password.casefold() == "changeme123!"):
        raise RuntimeError("ADMIN_PASSWORD must be unique and at least 12 characters")
    if admin_password:
        try:
            validate_password_strength(admin_password)
        except ValueError as exc:
            raise RuntimeError("ADMIN_PASSWORD must include uppercase, lowercase, numeric, and symbol characters") from exc

    database_password = os.getenv("POSTGRES_PASSWORD", "")
    if database_password.casefold() == "change-this-local-password":
        raise RuntimeError("POSTGRES_PASSWORD must not use the example password")


def hash_password(password: str) -> str:
    """Hash a password using the configured Passlib schemes."""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Check a password against a stored hash."""
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int, role: str) -> str:
    """Create a signed token containing the user's ID, role, and expiry."""
    minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode a signed token or raise when it is invalid or expired."""
    try:
        return jwt.decode(token, get_jwt_secret(), algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired access token") from exc
