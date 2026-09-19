-- Run this after all previous migrations. This closes a real gap: horses'
-- wins/places/starts/earnings were already auto-computed by a trigger
-- (race_entries_results_migration.sql), but jockeys/trainers/owners/
-- stables were never wired up the same way — their stats have been
-- sitting static since creation, disconnected from actual race results.
--
-- After this runs, all of these become trigger-maintained, exactly like
-- horses already are: never hand-edited, always recalculated from
-- scratch from race_results/horses whenever something relevant changes.

-- ---------------------------------------------------------------------
-- RECOMPUTE FUNCTIONS
-- ---------------------------------------------------------------------

create or replace function public.recompute_jockey_stats(p_jockey_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rides int;
  v_wins int;
  v_places int;
begin
  if p_jockey_id is null then return; end if;

  select
    count(*),
    count(*) filter (where position = 1),
    count(*) filter (where position in (2, 3))
  into v_rides, v_wins, v_places
  from public.race_results
  where jockey_id = p_jockey_id;

  update public.jockeys set
    rides = coalesce(v_rides, 0),
    wins = coalesce(v_wins, 0),
    places = coalesce(v_places, 0),
    win_pct = case when coalesce(v_rides, 0) > 0
      then round((coalesce(v_wins, 0)::numeric / v_rides) * 100, 1)
      else 0
    end
  where id = p_jockey_id;
end;
$$;

create or replace function public.recompute_trainer_stats(p_trainer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wins int;
  v_horses int;
begin
  if p_trainer_id is null then return; end if;

  select count(*) filter (where position = 1) into v_wins
  from public.race_results where trainer_id = p_trainer_id;

  select count(*) into v_horses
  from public.horses where trainer_id = p_trainer_id;

  update public.trainers set
    wins = coalesce(v_wins, 0),
    horses = coalesce(v_horses, 0)
  where id = p_trainer_id;
end;
$$;

-- Ranking is relative to every other trainer, so it's recomputed for the
-- whole table (not just one row) whenever any trainer's wins could have
-- changed. Fine at realistic trainer-count scale (dozens, not millions).
create or replace function public.recompute_trainer_rankings()
returns void
language sql
security definer
set search_path = public
as $$
  update public.trainers t
  set ranking = ranked.rn
  from (
    select id, row_number() over (order by wins desc, name asc) as rn
    from public.trainers
  ) ranked
  where t.id = ranked.id;
$$;

create or replace function public.recompute_owner_stats(p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wins int;
  v_horses int;
begin
  if p_owner_id is null then return; end if;

  select count(*) filter (where rr.position = 1) into v_wins
  from public.race_results rr
  join public.horses h on h.id = rr.horse_id
  where h.owner_id = p_owner_id;

  select count(*) into v_horses from public.horses where owner_id = p_owner_id;

  update public.owners set
    wins = coalesce(v_wins, 0),
    horses = coalesce(v_horses, 0)
  where id = p_owner_id;
end;
$$;

create or replace function public.recompute_stable_horse_count(p_stable_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stable_id is null then return; end if;
  update public.stables s
  set horses = (select count(*) from public.horses h where h.stable_id = p_stable_id)
  where s.id = p_stable_id;
end;
$$;

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------

-- Extends the existing race_results trigger (same function name, so the
-- trigger already attached to race_results picks up this new body
-- automatically — no need to redeclare the trigger itself) to also
-- recompute the jockey's and trainer's stats, not just the horse's.
create or replace function public.trigger_recompute_horse_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_horse_stats(old.horse_id);
    perform public.recompute_jockey_stats(old.jockey_id);
    perform public.recompute_trainer_stats(old.trainer_id);
    perform public.recompute_trainer_rankings();
    return old;
  end if;

  perform public.recompute_horse_stats(new.horse_id);
  perform public.recompute_jockey_stats(new.jockey_id);
  perform public.recompute_trainer_stats(new.trainer_id);

  if (tg_op = 'UPDATE') then
    if (old.horse_id is distinct from new.horse_id) then
      perform public.recompute_horse_stats(old.horse_id);
    end if;
    if (old.jockey_id is distinct from new.jockey_id) then
      perform public.recompute_jockey_stats(old.jockey_id);
    end if;
    if (old.trainer_id is distinct from new.trainer_id) then
      perform public.recompute_trainer_stats(old.trainer_id);
    end if;
  end if;

  perform public.recompute_trainer_rankings();
  return new;
end;
$$;

-- New: whenever a horse's trainer/owner/stable assignment changes (or a
-- horse is added/removed), the affected trainer's/owner's horse count and
-- the stable's horse count need recomputing too.
create or replace function public.trigger_recompute_horse_relations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_trainer_stats(old.trainer_id);
    perform public.recompute_owner_stats(old.owner_id);
    perform public.recompute_stable_horse_count(old.stable_id);
    perform public.recompute_trainer_rankings();
    return old;
  end if;

  perform public.recompute_trainer_stats(new.trainer_id);
  perform public.recompute_owner_stats(new.owner_id);
  perform public.recompute_stable_horse_count(new.stable_id);

  if (tg_op = 'UPDATE') then
    if (old.trainer_id is distinct from new.trainer_id) then
      perform public.recompute_trainer_stats(old.trainer_id);
    end if;
    if (old.owner_id is distinct from new.owner_id) then
      perform public.recompute_owner_stats(old.owner_id);
    end if;
    if (old.stable_id is distinct from new.stable_id) then
      perform public.recompute_stable_horse_count(old.stable_id);
    end if;
  end if;

  perform public.recompute_trainer_rankings();
  return new;
end;
$$;

drop trigger if exists on_horses_relations_change on public.horses;
create trigger on_horses_relations_change
  after insert or update or delete on public.horses
  for each row execute procedure public.trigger_recompute_horse_relations();

-- ---------------------------------------------------------------------
-- ONE-TIME BACKFILL — recompute everything that already exists now,
-- rather than waiting for the next race result to trigger it.
-- ---------------------------------------------------------------------

select public.recompute_jockey_stats(id) from public.jockeys;
select public.recompute_trainer_stats(id) from public.trainers;
select public.recompute_owner_stats(id) from public.owners;
select public.recompute_stable_horse_count(id) from public.stables;
select public.recompute_trainer_rankings();
