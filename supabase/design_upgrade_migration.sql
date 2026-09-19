-- Run this after all previous migrations. Adds what the redesigned
-- interface needs to display: stable silks, ratings, race-day-level
-- metadata (weather/track condition), and the extra result fields the
-- new race card design shows (starting price, performance rating).
-- Everything here is additive and nullable — nothing existing breaks.

-- ---------------------------------------------------------------------
-- 1. STABLE SILKS — rendered as SVG everywhere a stable appears
-- ---------------------------------------------------------------------

alter table public.stables add column if not exists silk_primary text not null default '#123C2E';
alter table public.stables add column if not exists silk_secondary text not null default '#E4C878';
alter table public.stables add column if not exists silk_cap text not null default '#123C2E';
alter table public.stables add column if not exists silk_pattern text not null default 'hoops'
  check (silk_pattern in ('plain', 'hoops', 'stripes', 'quarters', 'spots', 'sash', 'chevron'));

-- ---------------------------------------------------------------------
-- 2. RATINGS + PHOTOS
-- ---------------------------------------------------------------------

alter table public.horses add column if not exists rating int;
alter table public.horses add column if not exists photo_url text;
alter table public.trainers add column if not exists photo_url text;
alter table public.jockeys add column if not exists photo_url text;

-- ---------------------------------------------------------------------
-- 3. RACE-DAY (MEETING) METADATA — one row per race_date, holding the
--    info that applies to the whole meeting rather than one race.
--    Races aren't re-parented under this table (race_date stays the
--    join key) so nothing about existing races changes.
-- ---------------------------------------------------------------------

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  race_date date not null unique,
  course text not null default 'Champ de Mars',
  weather text,
  track_condition text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.meetings enable row level security;
create policy "Public read meetings" on public.meetings for select using (true);
create policy "Admins write meetings" on public.meetings for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. RICHER ENTRY/RESULT FIELDS
-- ---------------------------------------------------------------------

alter table public.race_entries add column if not exists odds text; -- e.g. "5/2", entered manually pre-race
alter table public.race_results add column if not exists starting_price text;
alter table public.race_results add column if not exists performance_rating int;

-- ---------------------------------------------------------------------
-- 5. INDEXES
-- ---------------------------------------------------------------------

create index if not exists meetings_race_date_idx on public.meetings (race_date);
