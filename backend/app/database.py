"""Configure the database engine and provide request-scoped sessions."""

import os

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


database = os.getenv("POSTGRES_DB")
username = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")
if not database or not username or not password:
    missing_settings = [
        name
        for name, value in (
            ("POSTGRES_DB", database),
            ("POSTGRES_USER", username),
            ("POSTGRES_PASSWORD", password),
        )
        if not value
    ]
    raise RuntimeError(f"Database settings must be configured: {', '.join(missing_settings)}")

DATABASE_URL = URL.create(
    "postgresql+psycopg",
    database=database,
    username=username,
    password=password,
    host=os.getenv("POSTGRES_HOST", "localhost"),
    port=int(os.getenv("POSTGRES_PORT", "5432")),
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for the application's SQLAlchemy models."""

    pass


def get_db():
    """Yield a database session and close it after the request finishes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
