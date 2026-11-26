-- FLOAE: Profiles table + Role-Based Access Control
-- Run this entire file in Supabase Dashboard -> SQL Editor -> New query -> Run

-- 1. Create an enum type for the four roles in FLOAE
create type user_role as enum ('recruiter', 'contractor', 'labourer', 'admin');

-- 2. Create a profiles table linked 1:1 with Supabase's built-in auth.users table.
--    We never store passwords ourselves - Supabase Auth handles that separately.
create table public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    full_name text not null,
    role user_role not null,
    phone text,
    created_at timestamptz default now()
);

-- 3. Enable Row Level Security (RLS) - without this, anyone with the anon key
--    could read/write any row. This is essential, not optional.
alter table public.profiles enable row level security;

-- 4. Policy: users can view their own profile
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

-- 5. Policy: users can update their own profile (but not their role - see below)
create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- 6. Policy: allow a new row to be inserted only for the signed-up user themself
create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- 7. Function + trigger: automatically create a profile row whenever someone
--    signs up via Supabase Auth. Role and full_name are passed in from the
--    frontend signup form via "options.data" and land in raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, role)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'Unnamed User'),
        coalesce((new.raw_user_meta_data->>'role')::user_role, 'labourer')
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
