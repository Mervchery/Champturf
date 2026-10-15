-- MTCJC race day 19: moved from Saturday 17 October to SUNDAY 18 OCTOBER 2026 (official communiqué, 15 Oct 2026).
--   * First race 12:15 (was 12:30). Withdrawals on Friday 16 October in the morning.
--   * Adds the news article + ticker item and the 8 races with their info (time, distance, class, rails).
--   * Runners are NOT added: the nominations are not final, so horses are added once declared / scraped.
-- Run ONCE in the Supabase SQL editor (safe to re-run — nothing is duplicated).
--
-- Race times: only the 12:15 start is official. The other races are the nomination sheet's times
-- minus 15 minutes; adjust them in Admin -> Races if the club publishes different ones.
-- Race prize money is not on the nomination sheet, so it is left at 0 until it is entered.
--
-- If the scraper already created races for 17 or 18 October, those races are moved to 18 October and
-- updated instead of duplicated (they keep the names Supertote gave them).

-- 0. Guard: an unexpected number of existing races would be mapped to the wrong race numbers.
do $$
begin
  if (select count(*) from public.races where race_date in (date '2026-10-17', date '2026-10-18')) not in (0, 8) then
    raise exception 'Expected 0 or 8 existing races on 17/18 Oct 2026 but found a different number — check Admin -> Races first.';
  end if;
end $$;

-- 1. News + ticker -------------------------------------------------------
insert into public.news (category, title, article_date, excerpt)
select 'Press release',
       '19th race day rescheduled to Sunday 18 October',
       date '2026-10-15',
       'Following correspondence from the authorities and an urgent MTCJC Board meeting held with the Trainers'' Association, the 19th race day of the 2026 season moves from Saturday 17 to Sunday 18 October 2026. Withdrawals will be made on Friday 16 October in the morning, and the first race is at 12:15 instead of 12:30.'
where not exists (select 1 from public.news n where n.title = '19th race day rescheduled to Sunday 18 October');

insert into public.ticker_items (text, sort_order)
select 'Race day 19 moved to Sunday 18 October — first race 12:15, withdrawals Friday 16 October morning',
       coalesce((select min(sort_order) from public.ticker_items), 0) - 1
where not exists (select 1 from public.ticker_items where text like 'Race day 19 moved to Sunday 18 October%');

-- 2. Race plan -----------------------------------------------------------
drop table if exists _race_plan;
create temp table _race_plan (race_no int, name text, race_time time, distance text, race_class text);
insert into _race_plan values
  (1, 'Race 1 [0-20]', time '12:15', '1450m', '0-20'),
  (2, 'Race 2 [0-25]', time '12:50', '990m', '0-25'),
  (3, 'Race 3 [BM56]', time '13:25', '1650m', 'BM56'),
  (4, 'Low Division Stakes', time '14:00', '1650m', null),
  (5, 'Pinnacle Stakes', time '14:35', '1365m', null),
  (6, 'MTC 175th Anniversary Cup', time '15:10', '2100m', 'Handicap 55+'),
  (7, 'Middle Stakes', time '15:45', '1450m', null),
  (8, 'Race 8 [BM36]', time '16:25', '1400m', 'BM36');

-- 3. The meeting moves to 18 October -------------------------------------
update public.races set race_date = date '2026-10-18' where race_date = date '2026-10-17';

-- Existing set of 8 (e.g. created by the scraper): update times / distance / class / rails in place.
with ranked as (
  select id, row_number() over (order by race_time, created_at) as rn
  from public.races where race_date = date '2026-10-18'
)
update public.races r
   set race_time = p.race_time, distance = p.distance, race_class = p.race_class, rails = '1.50m'
  from ranked k
  join _race_plan p on p.race_no = k.rn
 where r.id = k.id
   and (select count(*) from ranked) = 8;

-- Nothing there yet: create the 8 races.
insert into public.races (name, course, race_date, race_time, distance, race_class, rails)
select p.name, 'Champ de Mars', date '2026-10-18', p.race_time, p.distance, p.race_class, '1.50m'
from _race_plan p
where not exists (select 1 from public.races where race_date = date '2026-10-18');

insert into public.meetings (race_date, course, notes)
values (date '2026-10-18', 'Champ de Mars', 'Rescheduled from Saturday 17 October (official MTCJC communiqué, 15 October 2026). Withdrawals Friday 16 October morning. First race 12:15. Rail position 1.50m.')
on conflict (race_date) do update set notes = excluded.notes;

-- 4. Check: should list the 8 races of Sunday 18 October (no runners yet — these are nominations only).
select r.race_time, r.name, r.race_class, r.distance, count(e.id) as runners
from public.races r left join public.race_entries e on e.race_id = r.id
where r.race_date = date '2026-10-18'
group by r.id order by r.race_time;
