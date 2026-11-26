"""
Database connection helper.

The backend talks to Postgres directly (via DATABASE_URL, the Supabase
connection string) using SQLAlchemy Core - no full ORM models needed for
a project this size, just plain SQL through a connection pool.

Note: because the backend connects with the Postgres connection string
directly, it bypasses Supabase's Row Level Security (RLS). That's fine -
RLS still protects any future direct-from-browser queries, and here in
FastAPI every route re-checks the caller's role/ownership itself (see
app/auth.py's require_role, and the ownership checks in app/routers/).
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True) if settings.database_url else None


def get_db() -> Generator[Connection, None, None]:
    """FastAPI dependency that yields a live DB connection, closed after the request."""
    if engine is None:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy backend/.env.example to backend/.env "
            "and fill in your Supabase connection string."
        )
    with engine.connect() as conn:
        yield conn
