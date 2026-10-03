-- Data scraped from the Mauritius Turf Club Jockey Club race cards
-- (scraper/scrape-mtc.mjs): ratings, horse weight, gear changes, race class,
-- rails, the real prize split and the "Time Factors" table.

alter table public.race_entries add column if not exists rating integer;
alter table public.race_entries add column if not exists hwt integer;          -- horse weight now (kg)
alter table public.race_entries add column if not exists hwt_last integer;     -- horse weight last run (kg)
alter table public.race_entries add column if not exists equip text;           -- official gear code, e.g. "A", "XA"
alter table public.race_entries add column if not exists gear_changed boolean not null default false;
alter table public.race_entries add column if not exists gear_prev text;       -- gear last run, when changed
alter table public.race_entries add column if not exists tf_fastest text;      -- fastest time, e.g. 0:54.29
alter table public.race_entries add column if not exists tf_days_since text;   -- "28 d" / "19 w"
alter table public.race_entries add column if not exists tf_best3 text;        -- best of last 3 starts

alter table public.races add column if not exists race_class text;             -- e.g. BM36
alter table public.races add column if not exists rails text;                  -- e.g. 2.25m (Pent: 2.8 …)
alter table public.races add column if not exists prize_split integer[];       -- 1st, 2nd, 3rd, 4th (Rs)
