-- Run this after race_entries_results_migration.sql. This migration:
--   1. Replaces horses.owner/trainer/stable (free text) with real foreign
--      keys, so renaming a stable/trainer/owner automatically updates
--      every horse that references it — nothing to re-type by hand.
--   2. Same for trainers.stable and jockeys.mentor (apprentice's mentor
--      is now a real jockey reference, not a typed name).
--   3. Adds race_entries.runner_no — the racecard number shown before
--      Gate on the public race card.

-- ---------------------------------------------------------------------
-- Helper: safely backfill a new *_id column by matching an old text
-- column to another table's `name`, only if that old column still exists
-- (some setups may already be past this point).
-- ---------------------------------------------------------------------

do $$
begin
  -- horses.owner (text) -> horses.owner_id (FK to owners)
  alter table public.horses add column if not exists owner_id uuid references public.owners (id) on delete set null;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='horses' and column_name='owner') then
    update public.horses h set owner_id = o.id from public.owners o where h.owner_id is null and o.name = h.owner;
    alter table public.horses drop column owner;
  end if;

  -- horses.trainer (text) -> horses.trainer_id (FK to trainers)
  alter table public.horses add column if not exists trainer_id uuid references public.trainers (id) on delete set null;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='horses' and column_name='trainer') then
    update public.horses h set trainer_id = t.id from public.trainers t where h.trainer_id is null and t.name = h.trainer;
    alter table public.horses drop column trainer;
  end if;

  -- horses.stable (text) -> horses.stable_id (FK to stables)
  alter table public.horses add column if not exists stable_id uuid references public.stables (id) on delete set null;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='horses' and column_name='stable') then
    update public.horses h set stable_id = s.id from public.stables s where h.stable_id is null and s.name = h.stable;
    alter table public.horses drop column stable;
  end if;

  -- trainers.stable (text) -> trainers.stable_id (FK to stables)
  alter table public.trainers add column if not exists stable_id uuid references public.stables (id) on delete set null;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='trainers' and column_name='stable') then
    update public.trainers t set stable_id = s.id from public.stables s where t.stable_id is null and s.name = t.stable;
    alter table public.trainers drop column stable;
  end if;

  -- jockeys.mentor (text, apprentices only) -> jockeys.mentor_id (FK to jockeys)
  alter table public.jockeys add column if not exists mentor_id uuid references public.jockeys (id) on delete set null;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='jockeys' and column_name='mentor') then
    update public.jockeys j set mentor_id = m.id from public.jockeys m where j.mentor_id is null and m.name = j.mentor;
    alter table public.jockeys drop column mentor;
  end if;
end $$;

-- race_entries.runner_no — the racecard number, separate from the
-- starting-gate/barrier number.
alter table public.race_entries add column if not exists runner_no int;
