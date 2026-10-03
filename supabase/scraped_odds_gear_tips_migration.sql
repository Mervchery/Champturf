-- Odds, gear, tips and racing notes now come straight from the scraper
-- (supertote.mu already publishes the tote Win/Place prices), so the
-- manual MTC / SMS odds entry is retired.
--
--   race_entries.odds       -> now the scraped tote WIN price (existing column, same meaning)
--   race_entries.place_odds -> scraped tote PLACE price (new)
--   race_entries.gear       -> scraped gear letters, comma-separated, e.g. "B,T" (new)
--   race_entries.is_tipped  -> true for the runner Supertote tips as favourite (new)
--   race_results.*          -> same win/place/gear/tipped fields for past races (new)
--   races.racing_notes      -> the "Racing Notes" analysis paragraph (new)
--   races.danger_horse      -> the "Danger : <horse>" line (new)
--
-- sms_odds is dropped: that manual SMS Pariaz price is no longer used.

alter table public.race_entries add column if not exists place_odds text;
alter table public.race_entries add column if not exists gear text;
alter table public.race_entries add column if not exists is_tipped boolean not null default false;
alter table public.race_entries drop column if exists sms_odds;

alter table public.race_results add column if not exists win_odds text;
alter table public.race_results add column if not exists place_odds text;
alter table public.race_results add column if not exists gear text;
alter table public.race_results add column if not exists is_tipped boolean not null default false;

alter table public.races add column if not exists racing_notes text;
alter table public.races add column if not exists danger_horse text;
