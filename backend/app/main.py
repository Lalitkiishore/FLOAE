"""
FLOAE Backend - FastAPI entry point.

This is the starting skeleton for Phase 1.
Run locally with: uvicorn app.main:app --reload
"""

from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import CurrentUser, get_current_user, require_role
from app.config import settings
from app.routers import applications, jobs, stats

app = FastAPI(
    title="FLOAE API",
    description="Find Labour Online At Ease - Backend API",
    version="0.2.0",
)

app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(stats.router)

# Allow the Next.js frontend (localhost during dev, and your deployed
# frontend URL later) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip().rstrip("/")
        for origin in settings.frontend_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Simple endpoint to prove the API is alive."""
    return {"status": "ok", "service": "FLOAE backend"}


@app.get("/")
def root():
    return {"message": "Welcome to the FLOAE API. See /docs for available endpoints."}


@app.get("/me")
def get_me(user: Annotated[CurrentUser, Depends(get_current_user)]):
    """
    Returns the logged-in user's id, email, and role.
    Any authenticated user (any role) can call this.
    """
    return user


"""
Phase 1 had placeholder /dashboard/{role} routes here that just returned a
welcome message. Phase 2 replaces them with real data: see app/routers/jobs.py
(GET /jobs, POST /jobs, ...), app/routers/applications.py (apply, review
applicants, accept/reject), and app/routers/stats.py (the headline numbers
each dashboard shows).
"""
