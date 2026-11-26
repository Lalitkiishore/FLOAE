"""
Auth utilities for FLOAE backend.

Supabase issues an access token when a user logs in on the frontend. The
frontend sends that token in the Authorization header on every API call.
Rather than decoding the token locally (which requires a shared JWT secret
that newer Supabase projects don't expose by default), we verify it by
asking Supabase's own Auth server "who does this token belong to?". This
works regardless of whether the project uses legacy or new-style API keys.
"""

from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.config import settings
from app.db import get_db

security = HTTPBearer()


class CurrentUser(BaseModel):
    id: UUID
    email: str | None = None
    role: str


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Connection, Depends(get_db)],
) -> CurrentUser:
    """
    Verify the access token by calling Supabase's Auth server.
    Raises 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials

    try:
        response = httpx.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_publishable_key,
            },
            timeout=5.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not reach Supabase Auth server: {exc}",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    payload = response.json()
    # Never trust user_metadata for permissions: users can edit it themselves.
    role = db.execute(
        text("SELECT role::text FROM profiles WHERE id = :uid"),
        {"uid": payload["id"]},
    ).scalar()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No profile found for this account",
        )

    return CurrentUser(id=payload["id"], email=payload.get("email"), role=role)


def require_role(*allowed_roles: str):
    """
    Dependency factory for role-gating an endpoint.

    Usage:
        @app.get("/admin-only")
        def admin_route(user: CurrentUser = Depends(require_role("admin"))):
            ...
    """

    def role_checker(
        user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires one of these roles: {allowed_roles}. "
                f"Your role is '{user.role}'.",
            )
        return user

    return role_checker
