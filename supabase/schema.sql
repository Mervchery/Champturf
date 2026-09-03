-- Run this in the Supabase SQL editor (or via `supabase db push` with the
-- CLI) before using admin auth.

-- One row per authenticated user, holding their admin role (if any).
-- New signups get no role by default — you grant admin access explicitly
-- by setting `role` (see the UPDATE example at the bottom of this file).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text, -- one of: 'Super Admin' | 'Administrator' | 'Race Manager' | 'Editor' | 'Statistician' | 'Stream Operator' | null
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile (needed for any client-side role checks
-- you add later, e.g. showing/hiding UI). Nobody can read others' profiles
-- or write to this table directly from the client — role changes should go
-- through the Supabase dashboard, the SQL editor, or a service-role script.
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Automatically create a profile row (with no role) whenever someone signs
-- up, so middleware's `.select('role').eq('id', user.id).single()` always
-- finds a row instead of erroring on a missing one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- After creating a user (Supabase dashboard → Authentication → Users →
-- Add user, or have them sign up), grant admin access by running:
--
--   update public.profiles set role = 'Super Admin' where email = 'you@example.com';
--
-- Until a user has a role set here, middleware will redirect them away
-- from /admin even if they're a valid, signed-in Supabase user.
-- ---------------------------------------------------------------------
