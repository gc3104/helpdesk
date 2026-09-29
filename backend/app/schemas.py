"""Define validated API request and response models."""

from datetime import datetime
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


Priority = Literal["Low", "Medium", "High"]
TicketStatus = Literal["Open", "In Progress", "Resolved"]


def strip_text(value: object) -> object:
    """Trim string inputs while leaving other values for Pydantic to check."""
    return value.strip() if isinstance(value, str) else value


def validate_password_strength(value: str) -> str:
    """Require a nonblank password with mixed character classes."""
    if not value.strip():
        raise ValueError("Password cannot contain only whitespace")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must include an uppercase letter")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must include a lowercase letter")
    if not re.search(r"[0-9]", value):
        raise ValueError("Password must include a number")
    if not re.search(r"[^A-Za-z0-9\s]", value):
        raise ValueError("Password must include a symbol")
    return value


class RegisterRequest(BaseModel):
    """Validated fields for creating a customer account."""

    name: str = Field(min_length=2, max_length=100)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("name", "email", mode="before")
    @classmethod
    def trim_text_fields(cls, value: object) -> object:
        return strip_text(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    """Credentials used to sign in to an account."""

    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email", mode="before")
    @classmethod
    def trim_email(cls, value: object) -> object:
        return strip_text(value)


class PasswordChangeRequest(BaseModel):
    """Current and replacement passwords for an account update."""

    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserResponse(BaseModel):
    """Public profile fields returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime


class TokenResponse(BaseModel):
    """Bearer token and profile returned after authentication."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TicketCreate(BaseModel):
    """Validated fields required to create a support ticket."""

    title: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=10, max_length=5000)
    category: str = Field(min_length=2, max_length=60)
    priority: Priority = "Medium"

    @field_validator("title", "description", "category", mode="before")
    @classmethod
    def trim_text_fields(cls, value: object) -> object:
        return strip_text(value)


class TicketUpdate(BaseModel):
    """Validated fields used to replace a ticket's editable details."""

    title: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=10, max_length=5000)
    category: str = Field(min_length=2, max_length=60)
    priority: Priority

    @field_validator("title", "description", "category", mode="before")
    @classmethod
    def trim_text_fields(cls, value: object) -> object:
        return strip_text(value)


class TicketStatusUpdate(BaseModel):
    """A requested ticket status change."""

    status: TicketStatus


class TicketResponse(BaseModel):
    """Ticket fields returned to customers and administrators."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: str
    priority: Priority
    status: TicketStatus
    owner_id: int
    created_at: datetime
    updated_at: datetime


class AdminTicketResponse(TicketResponse):
    """Ticket response with the submitting user's profile."""

    owner: UserResponse


class TicketStats(BaseModel):
    """Counts of tickets across the supported workflow statuses."""

    total: int
    open: int
    in_progress: int
    resolved: int
