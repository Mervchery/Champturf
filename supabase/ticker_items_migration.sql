-- The scrolling news ticker (components/Ticker.tsx) was a hardcoded array
-- of strings in the code — changing it meant editing and redeploying the
-- app. This makes it a real, admin-editable list instead, following the
-- same public-read / admin-write pattern as horses/jockeys/etc. (see
-- supabase/entities_schema.sql) and reusing that file's public.is_admin().
create table if not exists public.ticker_items (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  -- Controls left-to-right display order (ascending). Ties broken by
  -- creation order, so a freshly added item without a chosen position
  -- lands at the end rather than in an unpredictable spot.
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ticker_items enable row level security;

create policy "Public read ticker_items" on public.ticker_items for select using (true);
create policy "Admins write ticker_items" on public.ticker_items for all using (public.is_admin()) with check (public.is_admin());
