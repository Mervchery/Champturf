-- The same Jockey Club fields for finished races (race_results),
-- alongside the ones already added to race_entries by mtc_data_migration.sql.
alter table public.race_results add column if not exists rating integer;
alter table public.race_results add column if not exists hwt integer;
alter table public.race_results add column if not exists hwt_last integer;
alter table public.race_results add column if not exists equip text;
alter table public.race_results add column if not exists gear_changed boolean not null default false;
alter table public.race_results add column if not exists gear_prev text;
