-- Run this after schema.sql, races_schema.sql, entities_schema.sql, and
-- streams_schema.sql. This migration:
--   1. Locks race_entries and race_results to real horses (foreign key,
--      not free text) so invalid/duplicate horse names can't be entered.
--   2. Adds richer per-entry info (jockey, weight carried).
--   3. Replaces the old vague "places" stat on horses with explicit
--      wins/seconds/thirds/unplaced/starts/earnings, maintained
--      automatically by a trigger whenever results change — never by hand.

-- ---------------------------------------------------------------------
-- 1. race_entries: horse_name (text) -> horse_id (FK), + jockey + weight
-- ---------------------------------------------------------------------

alter table public.race_entries add column if not exists horse_id uuid references public.horses (id) on delete cascade;
alter table public.race_entries add column if not exists jockey_id uuid references public.jockeys (id) on delete set null;
alter table public.race_entries add column if not exists weight_kg numeric;

-- Best-effort backfill for any entries created before this migration,
-- matching by name. Wrapped in a column-existence check since some setups
-- never had a horse_name column to begin with (e.g. table already empty
-- or created after a partial earlier run) — this makes the migration safe
-- to run regardless of that history.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'race_entries' and column_name = 'horse_name'
  ) then
    update public.race_entries e
    set horse_id = h.id
    from public.horses h
    where e.horse_id is null and h.name = e.horse_name;
  end if;
end $$;

-- Any entry that couldn't be matched (typo'd/free-text name with no
-- matching horse, or no horse_name column existed to match from at all)
-- is now orphaned — remove it rather than leave invalid data, since going
-- forward entries can only be created for real horses.
delete from public.race_entries where horse_id is null;

alter table public.race_entries alter column horse_id set not null;
alter table public.race_entries drop column if exists horse_name;
alter table public.race_entries drop column if exists trainer; -- now derived from the horse record

-- ---------------------------------------------------------------------
-- 2. race_results: horse_name (text) -> horse_id (FK)
-- ---------------------------------------------------------------------

alter table public.race_results add column if not exists horse_id uuid references public.horses (id) on delete cascade;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'race_results' and column_name = 'horse_name'
  ) then
    update public.race_results r
    set horse_id = h.id
    from public.horses h
    where r.horse_id is null and h.name = r.horse_name;
  end if;
end $$;

delete from public.race_results where horse_id is null;

alter table public.race_results alter column horse_id set not null;
alter table public.race_results drop column if exists horse_name;

-- ---------------------------------------------------------------------
-- 3. horses: replace the old combined "places" with explicit counters
-- ---------------------------------------------------------------------

alter table public.horses add column if not exists seconds int not null default 0;
alter table public.horses add column if not exists thirds int not null default 0;
alter table public.horses add column if not exists unplaced int not null default 0;
alter table public.horses drop column if exists places;

-- ---------------------------------------------------------------------
-- 4. Automatic stat recomputation — a horse's wins/seconds/thirds/
--    unplaced/starts/earnings are never hand-edited; they're derived
--    entirely from that horse's race_results rows, recalculated from
--    scratch every time a relevant row is inserted, updated, or deleted.
--    This is idempotent (safe to run any number of times) and correct
--    regardless of the order results are entered or corrected in.
--
--    PRIZE SPLIT ASSUMPTION: since only the total race purse is stored,
--    not an official per-place breakdown, earnings are estimated as
--    60% of the purse to the winner, 20% to second, 10% to third, and
--    0% beyond that. Adjust the percentages below if your meetings use
--    a different split.
-- ---------------------------------------------------------------------

create or replace function public.recompute_horse_stats(p_horse_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.horses h set
    wins     = coalesce((select count(*) from public.race_results rr where rr.horse_id = p_horse_id and rr.position = 1), 0),
    seconds  = coalesce((select count(*) from public.race_results rr where rr.horse_id = p_horse_id and rr.position = 2), 0),
    thirds   = coalesce((select count(*) from public.race_results rr where rr.horse_id = p_horse_id and rr.position = 3), 0),
    starts   = coalesce((select count(*) from public.race_results rr where rr.horse_id = p_horse_id), 0),
    earnings = coalesce((
      select sum(
        ra.prize * case rr.position
          when 1 then 0.60
          when 2 then 0.20
          when 3 then 0.10
          else 0
        end
      )
      from public.race_results rr
      join public.races ra on ra.id = rr.race_id
      where rr.horse_id = p_horse_id
    ), 0)
  where h.id = p_horse_id;

  update public.horses h set
    unplaced = greatest(h.starts - h.wins - h.seconds - h.thirds, 0)
  where h.id = p_horse_id;
end;
$$;

create or replace function public.trigger_recompute_horse_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_horse_stats(old.horse_id);
    return old;
  end if;

  perform public.recompute_horse_stats(new.horse_id);
  if (tg_op = 'UPDATE' and old.horse_id is distinct from new.horse_id) then
    perform public.recompute_horse_stats(old.horse_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_race_results_change on public.race_results;
create trigger on_race_results_change
  after insert or update or delete on public.race_results
  for each row execute procedure public.trigger_recompute_horse_stats();

-- If race prize amounts are ever edited after results exist, earnings
-- need recomputing too (position counts don't change, but the split
-- does). This keeps that in sync automatically as well.
create or replace function public.trigger_recompute_on_race_prize_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_horse uuid;
begin
  if (new.prize is distinct from old.prize) then
    for affected_horse in select distinct horse_id from public.race_results where race_id = new.id loop
      perform public.recompute_horse_stats(affected_horse);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists on_race_prize_change on public.races;
create trigger on_race_prize_change
  after update on public.races
  for each row execute procedure public.trigger_recompute_on_race_prize_change();

-- Recompute everyone once now, in case any horses/races/results already
-- existed before this migration ran.
select public.recompute_horse_stats(id) from public.horses;
