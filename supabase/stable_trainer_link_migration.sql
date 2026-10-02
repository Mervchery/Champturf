-- In Mauritian racing, a trainer runs (at most) one stable, and that
-- stable's horses are simply "whichever horses this trainer has". Until
-- now the app tracked stable_id and trainer_id independently on each
-- horse, and stables.trainers was a free-text, comma-separated field with
-- no real relational link — meaning assigning a horse to the right stable
-- was manual, separate work from assigning its trainer, and easy to get
-- out of sync.
--
-- This adds the real link (stables.trainer_id) and keeps everything else
-- in sync automatically:
--   - Setting a stable's trainer (in the admin panel) immediately pulls
--     in every horse that trainer already has.
--   - From then on, whenever a horse's trainer is set (by the scraper or
--     the admin panel), its stable_id is derived from that trainer's
--     stable automatically — no manual per-horse stable assignment needed.
--
-- horses.stable_id itself isn't removed: it stays as a plain column so
-- every existing query that joins a horse's stable (silk display, the
-- HORSE_SELECT/HORSE_JOIN queries in lib/horses.ts and lib/races.ts, the
-- stable's own horse-list page) keeps working unchanged — it's just now
-- kept in sync by triggers instead of hand-entered.

alter table public.stables add column if not exists trainer_id uuid references public.trainers(id) on delete set null;
create unique index if not exists stables_trainer_id_key on public.stables(trainer_id) where trainer_id is not null;

-- Backfill: trainers.stable_id already existed (settable from the
-- trainer's own admin form) and may already reflect real links. Carry
-- those over as each stable's trainer_id, picking the winningest trainer
-- if a stable somehow has more than one (the old schema didn't prevent
-- that) — the new unique index above stops that ambiguity going forward.
update public.stables s
set trainer_id = pick.id
from (
  select distinct on (stable_id) id, stable_id
  from public.trainers
  where stable_id is not null
  order by stable_id, wins desc nulls last, id
) pick
where pick.stable_id = s.id and s.trainer_id is null;

-- Backfill: align every existing horse's stable_id with its trainer's
-- stable right now, using whichever link (old or new) is currently set.
update public.horses h
set stable_id = t.stable_id
from public.trainers t
where h.trainer_id = t.id
  and t.stable_id is not null
  and h.stable_id is distinct from t.stable_id;

-- Keep a trainer's stable_id in sync when their stable is set/changed
-- from the STABLE's side (the admin panel's new "Trainer" field), and
-- immediately pull in that trainer's horses.
create or replace function public.sync_stable_trainer_link() returns trigger as $$
begin
  if new.trainer_id is not null then
    update public.trainers set stable_id = new.id
      where id = new.trainer_id and stable_id is distinct from new.id;
    update public.horses set stable_id = new.id
      where trainer_id = new.trainer_id and stable_id is distinct from new.id;
  end if;
  -- Unlink the previous trainer if this stable is being re-assigned to a
  -- different one (or cleared), but only if that trainer still points
  -- here — avoids clobbering a link that changed some other way.
  if (tg_op = 'UPDATE') and old.trainer_id is not null and old.trainer_id is distinct from new.trainer_id then
    update public.trainers set stable_id = null
      where id = old.trainer_id and stable_id = old.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_stable_trainer_link on public.stables;
create trigger trg_sync_stable_trainer_link
  after insert or update of trainer_id on public.stables
  for each row execute function public.sync_stable_trainer_link();

-- Keep a horse's stable_id derived from its trainer's stable whenever the
-- horse's trainer is set or changed (covers the scraper and the horse
-- admin form, not just edits made from the stable's side above). Only
-- overrides stable_id when the trainer actually has a linked stable —
-- leaves it untouched otherwise, so a horse can still be manually placed
-- in a stable ahead of its trainer having one officially linked.
create or replace function public.sync_horse_stable_from_trainer() returns trigger as $$
declare
  linked_stable uuid;
begin
  if new.trainer_id is not null then
    select id into linked_stable from public.stables where trainer_id = new.trainer_id limit 1;
    if linked_stable is not null then
      new.stable_id := linked_stable;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_horse_stable on public.horses;
create trigger trg_sync_horse_stable
  before insert or update of trainer_id on public.horses
  for each row execute function public.sync_horse_stable_from_trainer();
