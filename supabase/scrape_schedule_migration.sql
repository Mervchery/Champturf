-- Race-day scrape schedule support. Run once (before the next scheduled scrape).
--
--   races.source_url      the Supertote page of each race, so the scheduler can refresh ONE race
--                         (filled in by the scraper — the first full scrape of each race day sets it)
--   scrape_checkpoints    which checkpoints already ran ("full:2026-10-10", "race:<id>:30m", …),
--                         so a late or repeated GitHub cron tick never scrapes the same checkpoint twice.
--                         Only the service-role key (the scheduled job) can read/write it.
alter table public.races add column if not exists source_url text;

create table if not exists public.scrape_checkpoints (
  dedupe_key text primary key,
  race_date  date not null,
  done_at    timestamptz not null default now()
);
create index if not exists scrape_checkpoints_date_idx on public.scrape_checkpoints (race_date);
alter table public.scrape_checkpoints enable row level security; -- no policies on purpose
