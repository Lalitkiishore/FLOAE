"""
FLOAE Backend - FastAPI entry point.

This is the starting skeleton for Phase 1.
Run locally with: uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="FLOAE API",
    description="Find Labour Online At Ease - Backend API",
    version="0.1.0",
)

# Allow the Next.js frontend (localhost during dev, and your deployed
# frontend URL later) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to your real frontend URL before final deploy
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
