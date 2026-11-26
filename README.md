# FLOAE — Find Labour Online At Ease

A labour marketplace connecting **recruiters** posting work with **contractors**
and **labourers** looking for it — role-based auth, live job listings, and an
end-to-end apply/review workflow.

## Features

- Email/password auth with four roles: recruiter, contractor, labourer, admin
  (Supabase Auth, role stored in `profiles` + RLS)
- Recruiters post, edit, close/reopen job listings and review applicants
  (accept/reject) from their dashboard
- Contractors/labourers browse and search open jobs (filter by category,
  location, job type), apply with a cover note, and track application status
- Admin dashboard with platform-wide stats
- Backend: FastAPI + PostgreSQL (SQLAlchemy), token-verified against Supabase
  Auth, role-gated routes
- Frontend: Next.js (App Router) + TypeScript + Tailwind
- Dockerized, with GitHub Actions CI

## What's inside

```
floae/
├── frontend/          Next.js + TypeScript + Tailwind (React app)
│   └── src/
│       ├── app/jobs/          Public job board + job detail/apply page
│       ├── app/dashboard/     Role-specific dashboards
│       └── components/        Nav, JobCard, WorkerDashboard
├── backend/           FastAPI (Python) REST API
│   ├── app/routers/           jobs.py, applications.py, stats.py
│   └── sql/                   Supabase schema migrations (run in order)
├── docker-compose.yml Runs both together locally
├── .github/workflows/ GitHub Actions CI (auto-builds on every push)
└── README.md          You are here
```

## Setup

1. Create a free [Supabase](https://supabase.com) project.
2. In the Supabase SQL Editor, run `backend/sql/001_profiles_and_rbac.sql`,
   then `backend/sql/002_jobs_and_applications.sql`, then
   `backend/sql/003_lock_down_roles_and_writes.sql`, in that order.
3. Copy `backend/.env.example` → `backend/.env` and fill in your Supabase
   `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`.
4. Copy `frontend/.env.local.example` → `frontend/.env.local` (same values,
   `NEXT_PUBLIC_`-prefixed).

## Running it locally (no Docker)

**Backend:**
```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Visit http://localhost:8000/docs for interactive API docs.

**Frontend:**
```
cd frontend
npm install
npm run dev
```
Visit http://localhost:3000.

## Running it with Docker

From the project root, after completing Setup above:
```
docker compose up --build
```
Frontend: http://localhost:3000 — Backend: http://localhost:8000

## Try it out

1. Sign up as a recruiter, post a job.
2. Sign up as a contractor or labourer (a different browser/incognito
   window), browse `/jobs`, and apply.
3. Back on the recruiter dashboard, open the listing's applicants and
   accept or reject.

## Roadmap

- Messaging between recruiter and accepted applicant
- Ratings/reviews after a job is completed
- Email notifications on application status change
