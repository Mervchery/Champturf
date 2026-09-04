-- Run this after supabase/schema.sql and supabase/races_schema.sql (this
-- file's write policies reuse the public.is_admin() function defined in
-- races_schema.sql).

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

create table if not exists public.horses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  sex text,
  breed text default 'Thoroughbred',
  color text,
  origin text,
  owner text,
  trainer text,
  stable text,
  wins int not null default 0,
  places int not null default 0,
  starts int not null default 0,
  earnings numeric not null default 0,
  medical_status text default 'Cleared to race',
  created_at timestamptz not null default now()
);

create table if not exists public.jockeys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nationality text,
  wins int not null default 0,
  places int not null default 0,
  win_pct numeric not null default 0,
  rides int not null default 0,
  apprentice boolean not null default false,
  bio text,
  suspensions int not null default 0,
  achievements text,
  mentor text,       -- apprentices only
  allowance text,     -- apprentices only, e.g. '3kg'
  progress text,      -- apprentices only
  created_at timestamptz not null default now()
);

create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stable text,
  wins int not null default 0,
  horses int not null default 0,
  ranking int,
  achievements text,
  created_at timestamptz not null default now()
);

create table if not exists public.stables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text,
  location text,
  horses int not null default 0,
  staff int not null default 0,
  gallery int not null default 0,
  trainers text, -- comma-separated names, kept simple rather than a join table
  created_at timestamptz not null default now()
);

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  horses int not null default 0,
  wins int not null default 0,
  achievements text,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  article_date date not null default current_date,
  excerpt text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ACCESS CONTROL — same pattern as races: public read, admin write.
-- Relies on public.is_admin() from races_schema.sql.
-- ---------------------------------------------------------------------

alter table public.horses   enable row level security;
alter table public.jockeys  enable row level security;
alter table public.trainers enable row level security;
alter table public.stables  enable row level security;
alter table public.owners   enable row level security;
alter table public.news     enable row level security;

create policy "Public read horses"   on public.horses   for select using (true);
create policy "Public read jockeys"  on public.jockeys  for select using (true);
create policy "Public read trainers" on public.trainers for select using (true);
create policy "Public read stables"  on public.stables  for select using (true);
create policy "Public read owners"   on public.owners   for select using (true);
create policy "Public read news"     on public.news     for select using (true);

create policy "Admins write horses"   on public.horses   for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins write jockeys"  on public.jockeys  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins write trainers" on public.trainers for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins write stables"  on public.stables  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins write owners"   on public.owners   for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins write news"     on public.news     for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- OPTIONAL SEED DATA — matches the old mock entities. Safe to run once;
-- each insert skips rows that already exist by name (or by title, for
-- news) so re-running this file won't duplicate them.
-- ---------------------------------------------------------------------

insert into public.trainers (name, stable, wins, horses, ranking, achievements)
select v.name, v.stable, v.wins, v.horses, v.ranking, v.achievements
from (values
  ('Jean-Marc Ferrière', 'Vallée Verte Stables', 64, 14, 1, 'Leading Trainer 2023 & 2024'),
  ('Kevin Li-A-Young', 'Baie du Cap Racing / Pointe d''Or Stables', 41, 16, 2, 'Trainer of the Meeting × 6'),
  ('Alicia Ramtohul', 'Domaine Coralie', 37, 11, 3, 'Rising Trainer Award 2022')
) as v(name, stable, wins, horses, ranking, achievements)
where not exists (select 1 from public.trainers t where t.name = v.name);

insert into public.stables (name, owner, location, horses, staff, gallery, trainers)
select v.name, v.owner, v.location, v.horses, v.staff, v.gallery, v.trainers
from (values
  ('Vallée Verte Stables', 'R. Appadoo', 'Vacoas', 14, 9, 3, 'Jean-Marc Ferrière'),
  ('Baie du Cap Racing', 'S. Naidoo Bloodstock', 'Black River', 9, 6, 2, 'Kevin Li-A-Young'),
  ('Domaine Coralie', 'Coralie Estates Ltd', 'Moka', 11, 7, 4, 'Alicia Ramtohul'),
  ('Pointe d''Or Stables', 'Pointe d''Or Syndicate', 'Grand Baie', 7, 5, 1, 'Kevin Li-A-Young')
) as v(name, owner, location, horses, staff, gallery, trainers)
where not exists (select 1 from public.stables s where s.name = v.name);

insert into public.owners (name, horses, wins, achievements)
select v.name, v.horses, v.wins, v.achievements
from (values
  ('R. Appadoo', 5, 22, 'Leading Owner 2024'),
  ('S. Naidoo Bloodstock', 4, 15, 'Champion Owner runner-up 2023'),
  ('Coralie Estates Ltd', 6, 19, 'Best newcomer stable 2022'),
  ('Pointe d''Or Syndicate', 3, 8, '—')
) as v(name, horses, wins, achievements)
where not exists (select 1 from public.owners o where o.name = v.name);

insert into public.horses (name, age, sex, breed, color, origin, owner, trainer, stable, wins, places, starts, earnings)
select v.name, v.age, v.sex, 'Thoroughbred', v.color, v.origin, v.owner, v.trainer, v.stable, v.wins, v.places, v.starts, v.earnings
from (values
  ('Île Royale', 5, 'Gelding', 'Bay', 'South Africa', 'R. Appadoo', 'Jean-Marc Ferrière', 'Vallée Verte Stables', 11, 7, 24, 2140000),
  ('Corsaire du Nord', 4, 'Colt', 'Chestnut', 'Mauritius', 'Coralie Estates Ltd', 'Alicia Ramtohul', 'Domaine Coralie', 9, 8, 20, 1785000),
  ('Belle Étoile', 6, 'Mare', 'Grey', 'France', 'S. Naidoo Bloodstock', 'Kevin Li-A-Young', 'Baie du Cap Racing', 14, 9, 31, 2960000),
  ('Vent d''Ouest', 3, 'Colt', 'Bay', 'Mauritius', 'Pointe d''Or Syndicate', 'Kevin Li-A-Young', 'Pointe d''Or Stables', 5, 6, 12, 820000),
  ('Marquis d''Argent', 5, 'Gelding', 'Black', 'South Africa', 'R. Appadoo', 'Jean-Marc Ferrière', 'Vallée Verte Stables', 8, 11, 26, 1610000),
  ('Fleur de Sel', 4, 'Filly', 'Chestnut', 'Mauritius', 'Coralie Estates Ltd', 'Alicia Ramtohul', 'Domaine Coralie', 7, 5, 17, 1230000),
  ('Roi des Sables', 7, 'Gelding', 'Bay', 'Mauritius', 'S. Naidoo Bloodstock', 'Kevin Li-A-Young', 'Baie du Cap Racing', 16, 13, 38, 3350000),
  ('Étincelle Bleue', 3, 'Filly', 'Grey', 'France', 'Pointe d''Or Syndicate', 'Kevin Li-A-Young', 'Pointe d''Or Stables', 4, 4, 10, 590000)
) as v(name, age, sex, color, origin, owner, trainer, stable, wins, places, starts, earnings)
where not exists (select 1 from public.horses h where h.name = v.name);

insert into public.jockeys (name, nationality, wins, places, win_pct, rides, apprentice, bio, suspensions, achievements, mentor, allowance, progress)
select v.name, v.nationality, v.wins, v.places, v.win_pct, v.rides, v.apprentice, v.bio, v.suspensions, v.achievements, v.mentor, v.allowance, v.progress
from (values
  ('D. Bissessur', 'Mauritius', 118, 96, 24.1, 490, false, 'A leading rider at Champ de Mars known for strong front-running tactics.', 0, 'Champion Jockey 2023, 2024', null, null, null),
  ('T. Govinden', 'Mauritius', 97, 88, 21.3, 455, false, 'Consistent top-three finisher with a strong record over sprint distances.', 1, 'Runner-up Champion Jockey 2024', null, null, null),
  ('M. Sanmoogam', 'Mauritius', 73, 70, 18.4, 397, false, 'Specialist in staying races, favoured by several leading stables.', 0, 'Top Stayer''s Jockey 2023', null, null, null),
  ('A. Pillay', 'South Africa', 58, 61, 16.9, 343, false, 'Visiting rider with strong seasonal form on the Mauritian circuit.', 0, '—', null, null, null),
  ('N. Rughoobur', 'Mauritius', 12, 19, 9.8, 122, true, null, 0, null, 'D. Bissessur', '3kg', 'Second season — steady improvement in big-field handling.'),
  ('K. Beeharry', 'Mauritius', 8, 14, 7.6, 105, true, null, 0, null, 'T. Govinden', '4kg', 'First full season — shortlisted for Apprentice of the Year.')
) as v(name, nationality, wins, places, win_pct, rides, apprentice, bio, suspensions, achievements, mentor, allowance, progress)
where not exists (select 1 from public.jockeys j where j.name = v.name);

insert into public.news (category, title, article_date, excerpt)
select v.category, v.title, v.article_date, v.excerpt
from (values
  ('Race preview', 'Coupe d''Or field takes shape as four rivals confirm', date '2026-09-01', 'Île Royale headlines a strong field for Saturday''s feature as connections weigh up the soft ground.'),
  ('Interview', 'Trainer Alicia Ramtohul on Domaine Coralie''s rise', date '2026-08-29', 'From five horses to eleven in three seasons — the Moka handler on building a winning string.'),
  ('Race review', 'Roi des Sables holds on in thrilling Grand Prix finish', date '2026-08-23', 'A photo finish separated the top two as the seven-year-old added another feature to his record.'),
  ('Press release', 'Champ de Mars announces upgraded starting stalls for new season', date '2026-08-20', 'Officials confirm infrastructure upgrades ahead of the September meetings.'),
  ('Race preview', 'Apprentices to watch this season', date '2026-08-18', 'Two claimers are drawing early attention from stables looking for weight relief.'),
  ('Interview', 'Jockey D. Bissessur on chasing a third straight title', date '2026-08-12', 'The reigning champion discusses fitness, tactics, and this season''s toughest rivals.')
) as v(category, title, article_date, excerpt)
where not exists (select 1 from public.news n where n.title = v.title);

-- ---------------------------------------------------------------------
-- ADMIN USER MANAGEMENT — lets admins see and change other users' roles
-- in the "Users & roles" admin panel. `profiles` already has RLS enabled
-- and a "read own profile" policy from schema.sql; these add admin-only
-- read-all and update-role access on top (multiple permissive policies
-- combine with OR, so regular users keep exactly their existing access).
-- ---------------------------------------------------------------------

create policy "Admins read all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins update profile roles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
