-- Creates one stable per trainer from horse_ratings.csv (12 trainers) and links
-- each stable to the trainer with the same name via stables.trainer_id.
-- Requires stable_trainer_link_migration.sql to have been run: setting
-- stables.trainer_id automatically sets trainers.stable_id and pulls in every
-- horse that trainer already has (horses.stable_id).
-- Safe to re-run: existing stables / links are reused, not duplicated.
--
-- Run fix_gujadhur_trainers.sql first. "GUJADHUR" = Ramapatee Gujadhur,
-- "R GUJADHUR" = Rameshwar Gujadhur (same convention as that script).

do $$
declare
  rec record;
  t_id uuid;
  s_id uuid;
begin
  for rec in
    select * from (values
      ('A NAGADOO',      'A Nagadoo'),
      ('A SEWDYAL',      'A Sewdyal'),
      ('C DABY',         'C Daby'),
      ('C HEWITSON',     'C Hewitson'),
      ('GUJADHUR',       'Ramapatee Gujadhur'),
      ('J AWOTAR',       'J Awotar'),
      ('M MOOTIEN',      'M Mootien'),
      ('R GUJADHUR',     'Rameshwar Gujadhur'),
      ('SHIRISH NARANG', 'Shirish Narang'),
      ('SM MAHADIA',     'SM Mahadia'),
      ('V ALLET',        'V Allet'),
      ('V RUHEE',        'V Ruhee')
    ) as v(csv_name, display_name)
  loop
    -- 1. Find the trainer by CSV name or display name (normalized), else create it.
    select id into t_id from public.trainers
      where normalized_name in (public.normalize_name(rec.csv_name), public.normalize_name(rec.display_name))
      order by (normalized_name = public.normalize_name(rec.display_name)) desc
      limit 1;
    if t_id is null then
      insert into public.trainers (name) values (rec.display_name) returning id into t_id;
      raise notice 'Created trainer %', rec.display_name;
    end if;

    -- 2. Find the stable with the same name, else create it (named after the trainer).
    select id into s_id from public.stables
      where normalized_name = public.normalize_name(rec.display_name);
    if s_id is null then
      select id into s_id from public.stables where trainer_id = t_id limit 1;
    end if;
    if s_id is null then
      insert into public.stables (name) values (rec.display_name) returning id into s_id;
      raise notice 'Created stable %', rec.display_name;
    end if;

    -- 3. Link stable -> trainer. The trigger sets trainers.stable_id and
    --    moves all of the trainer's horses into this stable.
    update public.stables set trainer_id = t_id
      where id = s_id and trainer_id is distinct from t_id;
  end loop;
end $$;

-- Check: horses per stable should match the trainer's horse count.
select s.name as stable, t.name as trainer, count(h.id) as horses_in_db
from public.stables s
join public.trainers t on t.id = s.trainer_id
left join public.horses h on h.stable_id = s.id
group by s.name, t.name
order by s.name;

-- OPTIONAL: also load the ratings from the CSV (uncomment and fill if wanted).
-- update public.horses h set rating = v.rating
-- from (values ('MERIDIUS', 83), ... ) as v(name, rating)
-- where public.normalize_name(h.name) = public.normalize_name(v.name);
