-- Run this in the Supabase SQL editor after supabase/schema.sql (which
-- creates `profiles` — this file's write policies depend on it).

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course text not null default 'Champ de Mars',
  race_date date not null,
  race_time time not null,
  distance text not null,
  prize numeric not null default 0,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed')),
  conditions text,
  created_at timestamptz not null default now()
);

-- Starting entries for a race (used while status = 'upcoming').
create table if not exists public.race_entries (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  gate int,
  horse_name text not null,
  trainer text,
  created_at timestamptz not null default now()
);

-- Official finishing order (used once status = 'completed').
-- Horse/jockey are plain text for now rather than foreign keys — this
-- schema doesn't depend on a `horses` table existing yet. If/when horses
-- move to Supabase too, this can be normalized to horse_id.
create table if not exists public.race_results (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  position int not null,
  horse_name text not null,
  jockey text not null,
  finish_time text,
  created_at timestamptz not null default now(),
  unique (race_id, position)
);

-- ---------------------------------------------------------------------
-- ACCESS CONTROL
-- ---------------------------------------------------------------------

-- True if the signed-in user has any admin role in `profiles`. Used by the
-- write policies below — every admin role can manage races for now; split
-- this further per-role later if you want e.g. only "Race Manager" to edit.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role is not null
  );
$$;

alter table public.races enable row level security;
alter table public.race_entries enable row level security;
alter table public.race_results enable row level security;

-- Anyone (including signed-out visitors) can read — this is public race data.
create policy "Public read races" on public.races for select using (true);
create policy "Public read race_entries" on public.race_entries for select using (true);
create policy "Public read race_results" on public.race_results for select using (true);

-- Only admins can create/edit/delete.
create policy "Admins write races" on public.races for all
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins write race_entries" on public.race_entries for all
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins write race_results" on public.race_results for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- OPTIONAL SEED DATA — matches the old mock races, so the site doesn't
-- look empty on first load. Safe to run once; skips races that already
-- exist by name so re-running this file won't duplicate them.
-- ---------------------------------------------------------------------

insert into public.races (name, course, race_date, race_time, distance, prize, status, conditions)
select v.name, v.course, v.race_date, v.race_time, v.distance, v.prize, v.status, v.conditions
from (values
  ('Coupe d''Or de Maurice', 'Champ de Mars', date '2026-09-06', time '15:30', '2000m', 2500000, 'upcoming', 'Open handicap, 3yo+'),
  ('Prix des Débutants', 'Champ de Mars', date '2026-09-06', time '14:00', '1200m', 800000, 'upcoming', 'Maiden, 3yo'),
  ('Trophée Vallée Verte', 'Champ de Mars', date '2026-09-13', time '15:00', '1600m', 1200000, 'upcoming', 'Handicap, 4yo+'),
  ('Grand Prix de Port Louis', 'Champ de Mars', date '2026-08-23', time '15:30', '2400m', 3000000, 'completed', 'Group race, 4yo+'),
  ('Prix de la Baie du Cap', 'Champ de Mars', date '2026-08-16', time '14:30', '1400m', 950000, 'completed', 'Handicap, 3yo+'),
  ('Coupe des Apprentis', 'Champ de Mars', date '2026-08-09', time '13:45', '1000m', 400000, 'completed', 'Apprentice riders only')
) as v(name, course, race_date, race_time, distance, prize, status, conditions)
where not exists (select 1 from public.races r where r.name = v.name);

insert into public.race_results (race_id, position, horse_name, jockey, finish_time)
select r.id, x.position, x.horse_name, x.jockey, x.finish_time
from public.races r
join (values
  ('Grand Prix de Port Louis', 1, 'Roi des Sables', 'D. Bissessur', '2:29.44'),
  ('Grand Prix de Port Louis', 2, 'Île Royale', 'M. Sanmoogam', '2:29.81'),
  ('Grand Prix de Port Louis', 3, 'Belle Étoile', 'T. Govinden', '2:30.02'),
  ('Prix de la Baie du Cap', 1, 'Fleur de Sel', 'T. Govinden', '1:24.10'),
  ('Prix de la Baie du Cap', 2, 'Corsaire du Nord', 'D. Bissessur', '1:24.33'),
  ('Prix de la Baie du Cap', 3, 'Vent d''Ouest', 'A. Pillay', '1:24.55'),
  ('Coupe des Apprentis', 1, 'Étincelle Bleue', 'N. Rughoobur', '0:59.02'),
  ('Coupe des Apprentis', 2, 'Vent d''Ouest', 'K. Beeharry', '0:59.40')
) as x(race_name, position, horse_name, jockey, finish_time)
  on x.race_name = r.name
where not exists (
  select 1 from public.race_results rr where rr.race_id = r.id and rr.position = x.position
);
