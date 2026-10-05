-- Race-day alerts for members: follow a horse, get told when it is declared to run,
-- when its odds move, and how it finished. Run once, after user_accounts_migration.sql
-- and odds_movement_migration.sql.
--
--   horse_follows       who follows which horse (+ which alert types they want)
--   push_subscriptions  one row per browser/phone that enabled notifications
--   notifications       the in-app alert feed (also what gets pushed)
--
-- Notifications are WRITTEN only by scraper/alerts.mjs using the service-role key
-- (it bypasses RLS). Members can only read / mark-read / dismiss their own.

create table if not exists public.horse_follows (
  user_id     uuid not null references auth.users (id) on delete cascade,
  horse_id    uuid not null references public.horses (id) on delete cascade,
  notify_runs boolean not null default true,   -- declared to run + finishing result
  notify_odds boolean not null default true,   -- significant price move
  created_at  timestamptz not null default now(),
  primary key (user_id, horse_id)
);
create index if not exists horse_follows_horse_idx on public.horse_follows (horse_id);

alter table public.horse_follows enable row level security;
drop policy if exists "Members read own follows" on public.horse_follows;
drop policy if exists "Members add own follows" on public.horse_follows;
drop policy if exists "Members edit own follows" on public.horse_follows;
drop policy if exists "Members remove own follows" on public.horse_follows;
create policy "Members read own follows"   on public.horse_follows for select using (auth.uid() = user_id);
create policy "Members add own follows"    on public.horse_follows for insert with check (auth.uid() = user_id);
create policy "Members edit own follows"   on public.horse_follows for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Members remove own follows" on public.horse_follows for delete using (auth.uid() = user_id);

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  lang        text not null default 'en' check (lang in ('en', 'fr')),
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "Members read own push subs" on public.push_subscriptions;
drop policy if exists "Members add own push subs" on public.push_subscriptions;
drop policy if exists "Members edit own push subs" on public.push_subscriptions;
drop policy if exists "Members remove own push subs" on public.push_subscriptions;
create policy "Members read own push subs"   on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Members add own push subs"    on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Members edit own push subs"   on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Members remove own push subs" on public.push_subscriptions for delete using (auth.uid() = user_id);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  horse_id   uuid references public.horses (id) on delete cascade,
  race_id    uuid references public.races (id) on delete cascade,
  kind       text not null check (kind in ('declared', 'odds', 'result')),
  title      text not null,
  body       text not null,
  title_fr   text,
  body_fr    text,
  url        text not null,
  -- One alert per event per person: e.g. "declared:<race>:<horse>", "odds:<entry>:<change time>".
  dedupe_key text not null,
  read_at    timestamptz,
  pushed_at  timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "Members read own notifications" on public.notifications;
drop policy if exists "Members update own notifications" on public.notifications;
drop policy if exists "Members delete own notifications" on public.notifications;
create policy "Members read own notifications"   on public.notifications for select using (auth.uid() = user_id);
create policy "Members update own notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Members delete own notifications" on public.notifications for delete using (auth.uid() = user_id);
-- Members may only flip read_at, never rewrite the alert text.
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
