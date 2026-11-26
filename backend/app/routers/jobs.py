"""Job listing endpoints: the core of the FLOAE marketplace."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.auth import CurrentUser, get_current_user, require_role
from app.db import get_db
from app.schemas import Job, JobCreate, JobUpdate

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[Job])
def list_jobs(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Connection, Depends(get_db)],
    category: str | None = Query(default=None),
    location: str | None = Query(default=None),
    job_type: str | None = Query(default=None),
    search: str | None = Query(default=None, description="Matches title or description"),
    mine: bool = Query(default=False, description="Only jobs I posted (recruiters)"),
):
    """
    Browse open jobs. Everyone signed in can see open listings.
    Recruiters pass ?mine=true to see their own listings including closed ones.
    """
    clauses = []
    params: dict = {}

    if mine:
        clauses.append("jobs.recruiter_id = :uid")
        params["uid"] = user.id
    else:
        clauses.append("jobs.status = 'open'")

    if category:
        clauses.append("jobs.category ILIKE :category")
        params["category"] = category
    if location:
        clauses.append("jobs.location ILIKE :location")
        params["location"] = f"%{location}%"
    if job_type:
        clauses.append("jobs.job_type = :job_type")
        params["job_type"] = job_type
    if search:
        clauses.append("(jobs.title ILIKE :search OR jobs.description ILIKE :search)")
        params["search"] = f"%{search}%"

    where = " AND ".join(clauses) if clauses else "TRUE"

    rows = db.execute(
        text(
            f"""
            SELECT jobs.*, profiles.full_name AS recruiter_name,
                   (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) AS application_count
            FROM jobs
            JOIN profiles ON profiles.id = jobs.recruiter_id
            WHERE {where}
            ORDER BY jobs.created_at DESC
            LIMIT 200
            """
        ),
        params,
    ).mappings().all()

    return [dict(row) for row in rows]


@router.get("/{job_id}", response_model=Job)
def get_job(
    job_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Connection, Depends(get_db)],
):
    row = db.execute(
        text(
            """
            SELECT jobs.*, profiles.full_name AS recruiter_name,
                   (SELECT COUNT(*) FROM applications WHERE applications.job_id = jobs.id) AS application_count
            FROM jobs
            JOIN profiles ON profiles.id = jobs.recruiter_id
            WHERE jobs.id = :job_id
            """
        ),
        {"job_id": job_id},
    ).mappings().first()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if row["status"] != "open" and row["recruiter_id"] != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return dict(row)


@router.post("", response_model=Job, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    user: Annotated[CurrentUser, Depends(require_role("recruiter", "admin"))],
    db: Annotated[Connection, Depends(get_db)],
):
    row = db.execute(
        text(
            """
            INSERT INTO jobs (recruiter_id, title, description, category, location,
                               job_type, pay_type, pay_min, pay_max)
            VALUES (:recruiter_id, :title, :description, :category, :location,
                    :job_type, :pay_type, :pay_min, :pay_max)
            RETURNING *
            """
        ),
        {"recruiter_id": user.id, **payload.model_dump()},
    ).mappings().first()
    db.commit()
    return {**dict(row), "recruiter_name": user.email, "application_count": 0}


def _get_owned_job(db: Connection, job_id: UUID, user: CurrentUser):
    row = db.execute(text("SELECT * FROM jobs WHERE id = :job_id"), {"job_id": job_id}).mappings().first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if row["recruiter_id"] != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't own this job listing")
    return row


@router.patch("/{job_id}", response_model=Job)
def update_job(
    job_id: UUID,
    payload: JobUpdate,
    user: Annotated[CurrentUser, Depends(require_role("recruiter", "admin"))],
    db: Annotated[Connection, Depends(get_db)],
):
    _get_owned_job(db, job_id, user)

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    set_clause = ", ".join(f"{key} = :{key}" for key in updates)
    row = db.execute(
        text(f"UPDATE jobs SET {set_clause} WHERE id = :job_id RETURNING *"),
        {**updates, "job_id": job_id},
    ).mappings().first()
    db.commit()
    return dict(row)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: UUID,
    user: Annotated[CurrentUser, Depends(require_role("recruiter", "admin"))],
    db: Annotated[Connection, Depends(get_db)],
):
    _get_owned_job(db, job_id, user)
    db.execute(text("DELETE FROM jobs WHERE id = :job_id"), {"job_id": job_id})
    db.commit()
