-- Lets an admin scratch a runner by hand (Admin -> Races -> Entries -> "Scratch").
-- A manual scratch is "locked": the scraper will neither clear it nor re-flag it.
-- Run ONCE in the Supabase SQL editor (after scratched_migration.sql). Safe to re-run.
alter table public.race_entries add column if not exists scratched_manual boolean not null default false;
