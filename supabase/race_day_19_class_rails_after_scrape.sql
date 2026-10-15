-- Run AFTER the scraper has created the 18 October races. The scraper does not fill race class or rails,
-- so this sets them from the MTCJC nomination sheet, matching races by running order (race 1 = earliest).
-- Does nothing unless exactly 8 races exist on 18 October. Safe to re-run.

with plan(race_no, race_class) as (values
  (1, '0-20'), (2, '0-25'), (3, 'BM56'), (4, null), (5, null), (6, 'Handicap 55+'), (7, null), (8, 'BM36')
), ranked as (
  select id, row_number() over (order by race_time, created_at) as rn
  from public.races where race_date = date '2026-10-18'
)
update public.races r
   set race_class = coalesce(p.race_class, r.race_class), rails = '1.50m'
  from ranked k
  join plan p on p.race_no = k.rn
 where r.id = k.id
   and (select count(*) from ranked) = 8;

select race_time, name, race_class, rails from public.races where race_date = date '2026-10-18' order by race_time;
