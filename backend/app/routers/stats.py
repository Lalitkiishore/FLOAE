"""Small aggregate endpoints that power the dashboard headline numbers."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.auth import CurrentUser, require_role
from app.db import get_db

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/recruiter")
def recruiter_stats(
    user: Annotated[CurrentUser, Depends(require_role("recruiter", "admin"))],
    db: Annotated[Connection, Depends(get_db)],
):
    row = db.execute(
        text(
            """
            SELECT
                COUNT(*) FILTER (WHERE status = 'open') AS open_jobs,
                COUNT(*) AS total_jobs,
                (SELECT COUNT(*) FROM applications
                 JOIN jobs j ON j.id = applications.job_id
                 WHERE j.recruiter_id = :uid) AS total_applicants,
                (SELECT COUNT(*) FROM applications
                 JOIN jobs j ON j.id = applications.job_id
                 WHERE j.recruiter_id = :uid AND applications.status = 'pending') AS pending_applicants
            FROM jobs WHERE recruiter_id = :uid
            """
        ),
        {"uid": user.id},
    ).mappings().first()
    return dict(row)


@router.get("/worker")
def worker_stats(
    user: Annotated[CurrentUser, Depends(require_role("contractor", "labourer", "admin"))],
    db: Annotated[Connection, Depends(get_db)],
):
    row = db.execute(
        text(
            """
            SELECT
                COUNT(*) AS total_applications,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
                COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
            FROM applications WHERE applicant_id = :uid
            """
        ),
        {"uid": user.id},
    ).mappings().first()
    open_jobs = db.execute(text("SELECT COUNT(*) AS c FROM jobs WHERE status = 'open'")).scalar()
    return {**dict(row), "open_jobs": open_jobs}


@router.get("/admin")
def admin_stats(
    user: Annotated[CurrentUser, Depends(require_role("admin"))],
    db: Annotated[Connection, Depends(get_db)],
):
    row = db.execute(
        text(
            """
            SELECT
                (SELECT COUNT(*) FROM profiles) AS total_users,
                (SELECT COUNT(*) FROM profiles WHERE role = 'recruiter') AS recruiters,
                (SELECT COUNT(*) FROM profiles WHERE role = 'contractor') AS contractors,
                (SELECT COUNT(*) FROM profiles WHERE role = 'labourer') AS labourers,
                (SELECT COUNT(*) FROM jobs) AS total_jobs,
                (SELECT COUNT(*) FROM jobs WHERE status = 'open') AS open_jobs,
                (SELECT COUNT(*) FROM applications) AS total_applications
            """
        )
    ).mappings().first()
    return dict(row)
