-- Removes the 8 placeholder races created by race_day_19_sunday_18_oct_migration.sql, so the scraper can
-- create the 18 October races itself under Supertote's names (no doubled races).
-- Only deletes a race if it still has the placeholder name AND no runners AND no results, so anything the
-- scraper has already filled in is left alone. The news article, ticker line and meeting note stay.
-- Safe to re-run.

delete from public.races r
where r.race_date = date '2026-10-18'
  and r.name in ('Race 1 [0-20]', 'Race 2 [0-25]', 'Race 3 [BM56]', 'Low Division Stakes', 'Pinnacle Stakes',
                 'MTC 175th Anniversary Cup', 'Middle Stakes', 'Race 8 [BM36]')
  and not exists (select 1 from public.race_entries e where e.race_id = r.id)
  and not exists (select 1 from public.race_results x where x.race_id = r.id);

-- Check: what is left on 18 October (empty until the scraper picks the meeting up).
select r.race_time, r.name, r.race_class, count(e.id) as runners
from public.races r left join public.race_entries e on e.race_id = r.id
where r.race_date = date '2026-10-18'
group by r.id order by r.race_time;
