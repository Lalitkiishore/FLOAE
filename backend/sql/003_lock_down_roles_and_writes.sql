-- Run once in Supabase -> SQL Editor, after 001 and 002.

-- 1. All writes go through the FastAPI backend, so the browser key must not
--    be able to change these tables directly.
revoke insert, update, delete on public.profiles, public.jobs, public.applications
    from anon, authenticated;

-- 2. Signup may never create an admin, whatever the browser sends.
create or replace function public.handle_new_user()
returns trigger as $$
declare
    requested text := new.raw_user_meta_data->>'role';
begin
    insert into public.profiles (id, full_name, role)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'Unnamed User'),
        case when requested in ('recruiter', 'contractor', 'labourer')
             then requested::public.user_role
             else 'labourer'::public.user_role
        end
    );
    return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Check who is currently an admin. Demote any account you did not intend:
--    update public.profiles set role = 'labourer' where id = '<id>';
select id, full_name, role from public.profiles where role = 'admin';
