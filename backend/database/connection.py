"""
Database connection and session management.
Uses SQLite by default for portability.
Designed to be swapped to PostgreSQL/TimescaleDB for production deployment.
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from contextlib import contextmanager
from typing import Generator

from .models import Base

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Ensure data/ directory exists for SQLite
os.makedirs("data", exist_ok=True)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/digital_twin.db"
)

# For SQLite: enable WAL mode for better concurrent read performance
SQLITE_PRAGMAS = {
    "journal_mode": "wal",
    "cache_size": -1 * 64000,  # 64MB cache
    "foreign_keys": 1,
    "ignore_check_constraints": 0,
    "synchronous": 0,
}


def _set_sqlite_pragmas(dbapi_connection, connection_record):
    """Apply SQLite performance pragmas."""
    cursor = dbapi_connection.cursor()
    for pragma, value in SQLITE_PRAGMAS.items():
        cursor.execute(f"PRAGMA {pragma}={value}")
    cursor.close()


# ─────────────────────────────────────────────────────────────────────────────
# Engine and Session
# ─────────────────────────────────────────────────────────────────────────────

def create_db_engine(database_url: str = DATABASE_URL):
    """Create SQLAlchemy engine with appropriate settings."""
    connect_args = {}

    if database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        engine = create_engine(
            database_url,
            connect_args=connect_args,
            poolclass=StaticPool,
        )
        event.listen(engine, "connect", _set_sqlite_pragmas)
    else:
        # PostgreSQL / TimescaleDB
        engine = create_engine(
            database_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
        )

    return engine


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database schema."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session() -> Generator[Session, None, None]:
    """Context manager for database sessions (outside FastAPI)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
