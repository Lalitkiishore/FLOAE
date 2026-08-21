# FLOAE — Find Labour Online At Ease

Phase 1 skeleton: a working, containerized, CI-tested full-stack app.
Nothing fancy yet — this proves the pipeline (code → Docker → GitHub → deploy) works
before real features get built in Phase 2 and 3.

## What's inside

```
floae/
├── frontend/          Next.js + TypeScript + Tailwind (React app)
├── backend/           FastAPI (Python) REST API
├── docker-compose.yml Runs both together locally
├── .github/workflows/ GitHub Actions CI (auto-builds on every push)
└── README.md          You are here
```

## Running it locally (no Docker)

**Backend:**
```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Visit http://localhost:8000/health — should say `{"status":"ok"}`.
Visit http://localhost:8000/docs — interactive API docs (FastAPI gives you this for free).

**Frontend:**
```
cd frontend
npm install
npm run dev
```
Visit http://localhost:3000.

## Running it with Docker

1. Copy `backend/.env.example` → `backend/.env` and fill in your Supabase details.
2. Copy `frontend/.env.local.example` → `frontend/.env.local` and fill in your Supabase details.
3. From the project root: `docker compose up --build`
4. Frontend: http://localhost:3000 — Backend: http://localhost:8000

## What's NOT done yet (Phase 2/3 territory)

- No database models or real Supabase connection wired up
- No auth, no dashboards, no job posting — this is intentionally bare
- No production deployment yet (see step-by-step guide from Claude for that)
