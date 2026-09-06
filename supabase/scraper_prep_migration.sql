-- Run this before using the scraper. It doesn't change any existing data —
-- just adds unique indexes so the scraper can safely "insert, or update if
-- it already exists" (upsert) by name instead of accidentally creating
-- duplicate horses/jockeys/trainers every time it runs.

create unique index if not exists horses_name_unique on public.horses (name);
create unique index if not exists jockeys_name_unique on public.jockeys (name);
create unique index if not exists trainers_name_unique on public.trainers (name);
create unique index if not exists owners_name_unique on public.owners (name);
create unique index if not exists races_name_date_unique on public.races (name, race_date);
create unique index if not exists race_entries_race_horse_unique on public.race_entries (race_id, horse_id);
