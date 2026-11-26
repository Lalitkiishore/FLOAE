"""Application endpoints: applying to jobs, and recruiters reviewing applicants."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.auth import CurrentUser, get_current_user, require_role
from app.db import get_db
from app.schemas import Application, ApplicationCreate, ApplicationStatusUpdate

router = APIRouter(tags=["applications"])


@router.post(
    "/jobs/{job_id}/apply",
    response_model=Application,
    status_code=status.HTTP_201_CREATED,
)
def apply_to_job(
    job_id: UUID,
    payload: ApplicationCreate,
    user: Annotated[CurrentUser, Depends(require_role("contractor", "labourer", "admin"))],
    db: Annotated[Connection, Depends(get_db)],
):
    job = db.execute(text("SELECT * FROM jobs WHERE id = :job_id"), {"job_id": job_id}).mappings().first()
    if job is None or job["status"] != "open":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found or no longer open")

    existing = db.execute(
        text("SELECT id FROM applications WHERE job_id = :job_id AND applicant_id = :uid"),
        {"job_id": job_id, "uid": user.id},
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already applied to this job")

    row = db.execute(
        text(
            """
            INSERT INTO applications (job_id, applicant_id, cover_note)
            VALUES (:job_id, :uid, :cover_note)
            RETURNING *
            """
        ),
        {"job_id": job_id, "uid": user.id, "cover_note": payload.cover_note},
    ).mappings().first()
    db.commit()
    return dict(row)


@router.get("/applications/me", response_model=list[Application])
def my_applications(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Connection, Depends(get_db)],
):
    """The signed-in contractor/labourer's own applications, with job titles attached."""
    rows = db.execute(
        text(
            """
            SELECT applications.*, jobs.title AS job_title
            FROM applications
            JOIN jobs ON jobs.id = applications.job_id
            WHERE applications.applicant_id = :uid
            ORDER BY applications.created_at DESC
            """
        ),
        {"uid": user.id},
    ).mappings().all()
    return [dict(row) for row in rows]


@router.get("/jobs/{job_id}/applications", response_model=list[Application])
def job_applicants(
    job_id: UUID,
    user: Annotated[CurrentUser, Depends(require_role("recruiter", "admin"))],
    db: Annotated[Connection, Depends(get_db)],
):
    """Recruiter's view of everyone who applied to one of their job listings."""
    job = db.execute(text("SELECT * FROM jobs WHERE id = :job_id"), {"job_id": job_id}).mappings().first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job["recruiter_id"] != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't own this job listing")

    rows = db.execute(
        text(
            """
            SELECT applications.*, profiles.full_name AS applicant_name
            FROM applications
            JOIN profiles ON profiles.id = applications.applicant_id
            WHERE applications.job_id = :job_id
            ORDER BY applications.created_at ASC
            """
        ),
        {"job_id": job_id},
    ).mappings().all()
    return [dict(row) for row in rows]


@router.patch("/applications/{application_id}", response_model=Application)
def update_application_status(
    application_id: UUID,
    payload: ApplicationStatusUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Connection, Depends(get_db)],
):
    """
    Recruiters accept/reject applicants for their own jobs.
    Applicants may only set their own application to 'withdrawn'.
    """
    row = db.execute(
        text(
            """
            SELECT applications.*, jobs.recruiter_id AS job_recruiter_id
            FROM applications
            JOIN jobs ON jobs.id = applications.job_id
            WHERE applications.id = :application_id
            """
        ),
        {"application_id": application_id},
    ).mappings().first()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    is_owning_recruiter = row["job_recruiter_id"] == user.id or user.role == "admin"
    is_applicant = row["applicant_id"] == user.id

    if payload.status == "withdrawn":
        if not is_applicant:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the applicant can withdraw")
    else:
        if not is_owning_recruiter:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the recruiter who posted this job can accept/reject applicants",
            )

    updated = db.execute(
        text("UPDATE applications SET status = :status WHERE id = :application_id RETURNING *"),
        {"status": payload.status, "application_id": application_id},
    ).mappings().first()
    db.commit()
    return dict(updated)
