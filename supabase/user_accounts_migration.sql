-- Public user accounts (sign up with email/password or Google, etc.).
--
-- Members are ordinary Supabase auth users whose `profiles.role` stays NULL.
-- Only the admin roles listed in lib/roles.ts can enter /admin (checked in
-- middleware.ts AND again inside every server action), and only admins can
-- change anyone's role (RLS policy "Admins update profile roles"). There is
-- deliberately NO policy letting a user update their own profile, so signing
-- up can never grant extra access.

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;

-- Fill the profile from the sign-up form / Google profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill accounts created before this migration.
update public.profiles p
set full_name  = coalesce(p.full_name,  u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    avatar_url = coalesce(p.avatar_url, u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where u.id = p.id and (p.full_name is null or p.avatar_url is null);
