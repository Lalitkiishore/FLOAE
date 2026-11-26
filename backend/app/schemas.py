"""Pydantic request/response models for the jobs marketplace."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

JobType = Literal["full_time", "part_time", "gig", "contract"]
PayType = Literal["hourly", "fixed", "daily"]
JobStatus = Literal["open", "closed"]
ApplicationStatus = Literal["pending", "accepted", "rejected", "withdrawn"]


class JobCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=5000)
    category: str = Field(min_length=2, max_length=60)
    location: str = Field(min_length=2, max_length=120)
    job_type: JobType = "gig"
    pay_type: PayType = "daily"
    pay_min: float | None = None
    pay_max: float | None = None


class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    location: str | None = None
    job_type: JobType | None = None
    pay_type: PayType | None = None
    pay_min: float | None = None
    pay_max: float | None = None
    status: JobStatus | None = None


class Job(BaseModel):
    id: UUID
    recruiter_id: UUID
    title: str
    description: str
    category: str
    location: str
    job_type: str
    pay_type: str
    pay_min: float | None = None
    pay_max: float | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    recruiter_name: str | None = None
    application_count: int | None = None


class ApplicationCreate(BaseModel):
    cover_note: str | None = Field(default=None, max_length=2000)


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class Application(BaseModel):
    id: UUID
    job_id: UUID
    applicant_id: UUID
    cover_note: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    applicant_name: str | None = None
    applicant_email: str | None = None
    job_title: str | None = None
