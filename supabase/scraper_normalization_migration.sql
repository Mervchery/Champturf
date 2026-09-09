-- Run this after all previous migrations (schema.sql, races_schema.sql,
-- entities_schema.sql, race_entries_results_migration.sql,
-- relational_links_migration.sql, streams_schema.sql).
--
-- This migration does three distinct things — read through before running,
-- since step 2 modifies existing rows (merging duplicates), not just schema:
--   1. Adds a name-normalization function and merges any existing
--      jockeys/trainers/owners/stables that are the same person/entity
--      but stored with different spacing, punctuation, or capitalization
--      (e.g. "D. Schwarz" vs "D Schwarz" vs "d.schwarz").
--   2. Adds jockey_id/trainer_id (real foreign keys) to race_results,
--      plus margin and weight_kg columns; adds trainer_id to race_entries.
--      Existing rows are backfilled on a best-effort basis (see notes).
--   3. Adds indexes needed for a large historical import to stay fast.

-- ---------------------------------------------------------------------
-- 1. NAME NORMALIZATION + DEDUP
-- ---------------------------------------------------------------------

create or replace function public.normalize_name(input text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(regexp_replace(lower(coalesce(input, '')), '[.,]', '', 'g'), '\s+', ' ', 'g'));
$$;

-- Merges duplicate rows (same normalized name) in a name-keyed table,
-- repointing every foreign key that could reference it before deleting
-- the losing rows. Keeps the oldest row as the survivor. Prints what it
-- merged via RAISE NOTICE — check the SQL editor's output/logs after running.
do $$
declare
  dup record;
  survivor_id uuid;
  loser_ids uuid[];
begin
  -- Jockeys: referenced by race_entries.jockey_id, race_results.jockey_id
  -- (added below, so this table may not exist yet on a first-ever run —
  -- guarded), and jockeys.mentor_id (self-reference).
  for dup in
    select public.normalize_name(name) as norm, array_agg(id order by created_at asc) as ids
    from public.jockeys
    group by public.normalize_name(name)
    having count(*) > 1
  loop
    survivor_id := dup.ids[1];
    loser_ids := dup.ids[2:array_length(dup.ids,1)];
    update public.race_entries set jockey_id = survivor_id where jockey_id = any(loser_ids);
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='race_results' and column_name='jockey_id') then
      update public.race_results set jockey_id = survivor_id where jockey_id = any(loser_ids);
    end if;
    update public.jockeys set mentor_id = survivor_id where mentor_id = any(loser_ids);
    delete from public.jockeys where id = any(loser_ids);
    raise notice 'Merged % duplicate jockey row(s) into % (normalized name: "%")', array_length(loser_ids,1), survivor_id, dup.norm;
  end loop;

  -- Trainers: referenced by horses.trainer_id, race_entries.trainer_id
  -- (added below), race_results.trainer_id (added below).
  for dup in
    select public.normalize_name(name) as norm, array_agg(id order by created_at asc) as ids
    from public.trainers
    group by public.normalize_name(name)
    having count(*) > 1
  loop
    survivor_id := dup.ids[1];
    loser_ids := dup.ids[2:array_length(dup.ids,1)];
    update public.horses set trainer_id = survivor_id where trainer_id = any(loser_ids);
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='race_entries' and column_name='trainer_id') then
      update public.race_entries set trainer_id = survivor_id where trainer_id = any(loser_ids);
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='race_results' and column_name='trainer_id') then
      update public.race_results set trainer_id = survivor_id where trainer_id = any(loser_ids);
    end if;
    delete from public.trainers where id = any(loser_ids);
    raise notice 'Merged % duplicate trainer row(s) into % (normalized name: "%")', array_length(loser_ids,1), survivor_id, dup.norm;
  end loop;

  -- Owners: referenced by horses.owner_id.
  for dup in
    select public.normalize_name(name) as norm, array_agg(id order by created_at asc) as ids
    from public.owners
    group by public.normalize_name(name)
    having count(*) > 1
  loop
    survivor_id := dup.ids[1];
    loser_ids := dup.ids[2:array_length(dup.ids,1)];
    update public.horses set owner_id = survivor_id where owner_id = any(loser_ids);
    delete from public.owners where id = any(loser_ids);
    raise notice 'Merged % duplicate owner row(s) into % (normalized name: "%")', array_length(loser_ids,1), survivor_id, dup.norm;
  end loop;

  -- Stables: referenced by horses.stable_id, trainers.stable_id.
  for dup in
    select public.normalize_name(name) as norm, array_agg(id order by created_at asc) as ids
    from public.stables
    group by public.normalize_name(name)
    having count(*) > 1
  loop
    survivor_id := dup.ids[1];
    loser_ids := dup.ids[2:array_length(dup.ids,1)];
    update public.horses set stable_id = survivor_id where stable_id = any(loser_ids);
    update public.trainers set stable_id = survivor_id where stable_id = any(loser_ids);
    delete from public.stables where id = any(loser_ids);
    raise notice 'Merged % duplicate stable row(s) into % (normalized name: "%")', array_length(loser_ids,1), survivor_id, dup.norm;
  end loop;
end $$;

-- Now that duplicates are gone, replace the old plain-name unique indexes
-- with normalized-name ones, via a generated column (fast to query — the
-- app/scraper can filter on it directly instead of computing
-- normalize_name() on every read).
alter table public.jockeys drop constraint if exists jockeys_name_key;
drop index if exists jockeys_name_unique;
alter table public.jockeys add column if not exists normalized_name text generated always as (public.normalize_name(name)) stored;
create unique index if not exists jockeys_normalized_name_unique on public.jockeys (normalized_name);

alter table public.trainers drop constraint if exists trainers_name_key;
drop index if exists trainers_name_unique;
alter table public.trainers add column if not exists normalized_name text generated always as (public.normalize_name(name)) stored;
create unique index if not exists trainers_normalized_name_unique on public.trainers (normalized_name);

alter table public.owners drop constraint if exists owners_name_key;
drop index if exists owners_name_unique;
alter table public.owners add column if not exists normalized_name text generated always as (public.normalize_name(name)) stored;
create unique index if not exists owners_normalized_name_unique on public.owners (normalized_name);

alter table public.stables drop constraint if exists stables_name_key;
drop index if exists stables_name_unique;
alter table public.stables add column if not exists normalized_name text generated always as (public.normalize_name(name)) stored;
create unique index if not exists stables_normalized_name_unique on public.stables (normalized_name);

-- ---------------------------------------------------------------------
-- 2. race_results: add jockey_id/trainer_id (real FKs), margin, weight_kg
-- ---------------------------------------------------------------------

alter table public.race_results add column if not exists jockey_id uuid references public.jockeys (id) on delete set null;
alter table public.race_results add column if not exists trainer_id uuid references public.trainers (id) on delete set null;
-- Not available from the current data source (supertote.mu doesn't
-- publish distance-behind/margin) — present for when a source that does
-- publish it is added. Always null from the scraper until then.
alter table public.race_results add column if not exists margin text;
alter table public.race_results add column if not exists weight_kg numeric;

-- Best-effort backfill for existing rows, since jockey_id/trainer_id
-- can't be known retroactively with certainty:
--   - jockey_id: matched from the existing free-text `jockey` column by
--     normalized name. The `jockey` text column itself is untouched and
--     kept in sync going forward — the app's existing pages that read it
--     directly keep working unchanged.
--   - trainer_id: matched from the horse's CURRENT trainer (horses.trainer_id).
--     This is an approximation for historical rows — if a horse has since
--     changed trainers, older results will show the wrong (current)
--     trainer until re-scraped from a source that records trainer at
--     race time. New rows going forward always get the trainer as it was
--     stated on that specific race page, which is correct.
update public.race_results r
set jockey_id = j.id
from public.jockeys j
where r.jockey_id is null and r.jockey is not null and j.normalized_name = public.normalize_name(r.jockey);

update public.race_results r
set trainer_id = h.trainer_id
from public.horses h
where r.trainer_id is null and r.horse_id = h.id and h.trainer_id is not null;

-- ---------------------------------------------------------------------
-- 3. race_entries: add trainer_id (same historical-approximation caveat
--    as above for any pre-existing rows; new entries get the trainer as
--    stated on the page at scrape time)
-- ---------------------------------------------------------------------

alter table public.race_entries add column if not exists trainer_id uuid references public.trainers (id) on delete set null;

update public.race_entries e
set trainer_id = h.trainer_id
from public.horses h
where e.trainer_id is null and e.horse_id = h.id and h.trainer_id is not null;

-- ---------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES — needed for a large historical import
--    (2020-present) to stay fast as these tables grow.
-- ---------------------------------------------------------------------

create index if not exists race_entries_race_id_idx on public.race_entries (race_id);
create index if not exists race_entries_horse_id_idx on public.race_entries (horse_id);
create index if not exists race_entries_jockey_id_idx on public.race_entries (jockey_id);
create index if not exists race_entries_trainer_id_idx on public.race_entries (trainer_id);

create index if not exists race_results_race_id_idx on public.race_results (race_id);
create index if not exists race_results_horse_id_idx on public.race_results (horse_id);
create index if not exists race_results_jockey_id_idx on public.race_results (jockey_id);
create index if not exists race_results_trainer_id_idx on public.race_results (trainer_id);

create index if not exists horses_trainer_id_idx on public.horses (trainer_id);
create index if not exists horses_owner_id_idx on public.horses (owner_id);
create index if not exists horses_stable_id_idx on public.horses (stable_id);
create index if not exists trainers_stable_id_idx on public.trainers (stable_id);
create index if not exists jockeys_mentor_id_idx on public.jockeys (mentor_id);

create index if not exists races_race_date_idx on public.races (race_date);
