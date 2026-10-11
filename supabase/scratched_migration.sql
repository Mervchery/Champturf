-- Marks entries whose horse disappeared from the source page on a later scrape (= scratched / non-partant).
-- Run once in the Supabase SQL editor BEFORE deploying the new scraper and site code.
alter table public.race_entries add column if not exists scratched boolean not null default false;
alter table public.race_entries add column if not exists scratched_at timestamptz;
create index if not exists race_entries_scratched_idx on public.race_entries (race_id) where scratched;
