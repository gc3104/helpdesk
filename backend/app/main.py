"""Define the Helpdesk API routes and application lifecycle."""

import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from .database import Base, SessionLocal, engine
from .dependencies import CurrentUser, DbSession, require_admin
from .models import Ticket, User
from .schemas import (
    AdminTicketResponse,
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
    TicketCreate,
    TicketResponse,
    TicketStats,
    TicketStatus,
    TicketStatusUpdate,
    TicketUpdate,
    TokenResponse,
    UserResponse,
)
from .security import create_access_token, hash_password, validate_app_secrets, verify_password


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Validate configuration and initialize database records at startup."""
    validate_app_secrets()
    Base.metadata.create_all(bind=engine)
    seed_admin()
    yield


app = FastAPI(title="Helpdesk API", version="1.0.0", docs_url="/docs", openapi_url="/openapi.json", lifespan=lifespan)

origins = [origin.strip() for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_admin() -> None:
    """Create the configured admin account when it does not already exist."""
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    if not email or not password:
        return
    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email.lower()))
        if not existing:
            db.add(
                User(
                    name="Helpdesk Admin",
                    email=email.lower(),
                    password_hash=hash_password(password),
                    role="admin",
                )
            )
            db.commit()


@app.get("/api/health")
def health_check():
    """Return a simple response for availability checks."""
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession):
    """Create a customer account and return its access token."""
    email = str(payload.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email")

    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email",
        ) from exc
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        user=UserResponse.model_validate(user),
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession):
    """Authenticate an account and return an access token."""
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        user=UserResponse.model_validate(user),
    )


@app.get("/api/users/me", response_model=UserResponse)
def get_me(current_user: CurrentUser):
    """Return the authenticated user's public profile."""
    return current_user


@app.patch("/api/users/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: PasswordChangeRequest, current_user: CurrentUser, db: DbSession):
    """Verify the current password and save the new password hash."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must differ from the current password")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/tickets", response_model=list[TicketResponse])
def get_my_tickets(current_user: CurrentUser, db: DbSession):
    """List tickets owned by the authenticated customer."""
    return db.scalars(select(Ticket).where(Ticket.owner_id == current_user.id).order_by(Ticket.updated_at.desc())).all()


@app.post("/api/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreate, current_user: CurrentUser, db: DbSession):
    """Create a ticket owned by the authenticated customer."""
    ticket = Ticket(
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category.strip(),
        priority=payload.priority,
        owner_id=current_user.id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def get_ticket_for_user(ticket_id: int, user: User, db: Session) -> Ticket:
    """Return a ticket only when the user owns it or is an admin."""
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if ticket.owner_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this ticket")
    return ticket


@app.get("/api/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, current_user: CurrentUser, db: DbSession):
    """Return one ticket the authenticated user is allowed to view."""
    return get_ticket_for_user(ticket_id, current_user, db)


@app.patch("/api/tickets/{ticket_id}", response_model=TicketResponse)
def update_my_ticket(ticket_id: int, payload: TicketUpdate, current_user: CurrentUser, db: DbSession):
    """Update the details of an accessible ticket."""
    ticket = get_ticket_for_user(ticket_id, current_user, db)
    ticket.title = payload.title.strip()
    ticket.description = payload.description.strip()
    ticket.category = payload.category.strip()
    ticket.priority = payload.priority
    db.commit()
    db.refresh(ticket)
    return ticket


@app.patch("/api/tickets/{ticket_id}/status", response_model=TicketResponse)
def update_my_ticket_status(ticket_id: int, payload: TicketStatusUpdate, current_user: CurrentUser, db: DbSession):
    """Resolve or reopen a ticket owned by the authenticated customer."""
    ticket = get_ticket_for_user(ticket_id, current_user, db)
    if payload.status not in ("Open", "Resolved"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customers can only resolve or reopen their tickets",
        )
    ticket.status = payload.status
    db.commit()
    db.refresh(ticket)
    return ticket


@app.delete("/api/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: int, current_user: CurrentUser, db: DbSession):
    """Delete a ticket owned by the authenticated customer."""
    ticket = get_ticket_for_user(ticket_id, current_user, db)
    db.delete(ticket)
    db.commit()


@app.get("/api/admin/tickets", response_model=list[AdminTicketResponse], dependencies=[Depends(require_admin)])
def get_all_tickets(
    db: DbSession,
    status_filter: TicketStatus | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None, pattern="^(Low|Medium|High)$"),
    q: str | None = Query(default=None, max_length=140),
):
    """List tickets with optional status, priority, and title filters."""
    statement = select(Ticket).options(joinedload(Ticket.owner)).order_by(Ticket.updated_at.desc())
    if status_filter:
        statement = statement.where(Ticket.status == status_filter)
    if priority:
        statement = statement.where(Ticket.priority == priority)
    if q:
        statement = statement.where(Ticket.title.ilike(f"%{q.strip()}%"))
    return db.scalars(statement).unique().all()


@app.patch(
    "/api/admin/tickets/{ticket_id}/status",
    response_model=TicketResponse,
    dependencies=[Depends(require_admin)],
)
def admin_update_ticket_status(ticket_id: int, payload: TicketStatusUpdate, db: DbSession):
    """Set any ticket's status as an administrator."""
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    ticket.status = payload.status
    db.commit()
    db.refresh(ticket)
    return ticket


@app.get("/api/admin/stats", response_model=TicketStats, dependencies=[Depends(require_admin)])
def ticket_stats(db: DbSession):
    """Return total ticket counts grouped by workflow status."""
    rows = db.execute(select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status))
    counts: dict[str, int] = {}
    for row in rows:
        counts[row[0]] = row[1]
    return TicketStats(
        total=sum(counts.values()),
        open=counts.get("Open", 0),
        in_progress=counts.get("In Progress", 0),
        resolved=counts.get("Resolved", 0),
    )
