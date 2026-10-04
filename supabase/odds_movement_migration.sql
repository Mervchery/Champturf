-- Odds movement ("drift") tracking for upcoming races.
-- Every scrape compares the new Win/Place tote price with the stored one;
-- when it changed, the old price is kept as *_prev and the time is recorded.
-- *_open is the first price ever seen for the runner (the opening price).
alter table public.race_entries add column if not exists odds_prev text;
alter table public.race_entries add column if not exists place_odds_prev text;
alter table public.race_entries add column if not exists odds_open text;
alter table public.race_entries add column if not exists place_odds_open text;
alter table public.race_entries add column if not exists odds_changed_at timestamptz;
