-- FLOAE Phase 2: Jobs marketplace + Applications
-- Run this entire file in Supabase Dashboard -> SQL Editor -> New query -> Run
-- (Run 001_profiles_and_rbac.sql first if you haven't already.)

-- 1. Enums for job metadata
create type job_type as enum ('full_time', 'part_time', 'gig', 'contract');
create type pay_type as enum ('hourly', 'fixed', 'daily');
create type job_status as enum ('open', 'closed');
create type application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

-- 2. Jobs table. Only recruiters (and admins) post jobs.
create table public.jobs (
    id uuid primary key default gen_random_uuid(),
    recruiter_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    description text not null,
    category text not null,
    location text not null,
    job_type job_type not null default 'gig',
    pay_type pay_type not null default 'daily',
    pay_min numeric,
    pay_max numeric,
    status job_status not null default 'open',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index jobs_status_idx on public.jobs (status);
create index jobs_category_idx on public.jobs (category);
create index jobs_recruiter_idx on public.jobs (recruiter_id);

alter table public.jobs enable row level security;

-- Anyone signed in can browse open jobs; recruiters can also see their own closed jobs.
create policy "Open jobs are visible to everyone signed in"
    on public.jobs for select
    using (status = 'open' or recruiter_id = auth.uid());

create policy "Recruiters can insert their own jobs"
    on public.jobs for insert
    with check (recruiter_id = auth.uid());

create policy "Recruiters can update their own jobs"
    on public.jobs for update
    using (recruiter_id = auth.uid());

create policy "Recruiters can delete their own jobs"
    on public.jobs for delete
    using (recruiter_id = auth.uid());

-- 3. Applications table. Contractors/labourers apply to jobs.
create table public.applications (
    id uuid primary key default gen_random_uuid(),
    job_id uuid references public.jobs(id) on delete cascade not null,
    applicant_id uuid references public.profiles(id) on delete cascade not null,
    cover_note text,
    status application_status not null default 'pending',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (job_id, applicant_id)
);

create index applications_job_idx on public.applications (job_id);
create index applications_applicant_idx on public.applications (applicant_id);

alter table public.applications enable row level security;

-- Applicants can see their own applications.
create policy "Applicants can view own applications"
    on public.applications for select
    using (applicant_id = auth.uid());

-- Recruiters can see applications for jobs they posted.
create policy "Recruiters can view applications to their jobs"
    on public.applications for select
    using (
        exists (
            select 1 from public.jobs
            where jobs.id = applications.job_id
            and jobs.recruiter_id = auth.uid()
        )
    );

create policy "Applicants can apply to jobs"
    on public.applications for insert
    with check (applicant_id = auth.uid());

-- Applicant can withdraw; recruiter can accept/reject.
create policy "Applicant can update own application"
    on public.applications for update
    using (applicant_id = auth.uid());

create policy "Recruiter can update applications to their jobs"
    on public.applications for update
    using (
        exists (
            select 1 from public.jobs
            where jobs.id = applications.job_id
            and jobs.recruiter_id = auth.uid()
        )
    );

-- 4. Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger jobs_set_updated_at
    before update on public.jobs
    for each row execute procedure public.set_updated_at();

create trigger applications_set_updated_at
    before update on public.applications
    for each row execute procedure public.set_updated_at();
