-- Season (calendar-year) statistics. The all-time totals on jockeys / trainers / horses keep accumulating
-- as before; these views split the same race_results by season so championships and "active this season"
-- badges never mix in old years. Read-only, safe to re-run.

create or replace view public.jockey_season_stats with (security_invoker = true) as
select rr.jockey_id,
       extract(year from r.race_date)::int as season,
       count(*)::int as rides,
       count(*) filter (where rr.position = 1)::int as wins,
       count(*) filter (where rr.position in (2, 3))::int as places
from public.race_results rr
join public.races r on r.id = rr.race_id
where rr.jockey_id is not null
group by rr.jockey_id, extract(year from r.race_date);

create or replace view public.trainer_season_stats with (security_invoker = true) as
select rr.trainer_id,
       extract(year from r.race_date)::int as season,
       count(*)::int as runners,
       count(*) filter (where rr.position = 1)::int as wins,
       count(*) filter (where rr.position in (2, 3))::int as places
from public.race_results rr
join public.races r on r.id = rr.race_id
where rr.trainer_id is not null
group by rr.trainer_id, extract(year from r.race_date);

create or replace view public.horse_season_stats with (security_invoker = true) as
select rr.horse_id,
       extract(year from r.race_date)::int as season,
       count(*)::int as starts,
       count(*) filter (where rr.position = 1)::int as wins,
       count(*) filter (where rr.position = 2)::int as seconds,
       count(*) filter (where rr.position = 3)::int as thirds
from public.race_results rr
join public.races r on r.id = rr.race_id
where rr.horse_id is not null
group by rr.horse_id, extract(year from r.race_date);

grant select on public.jockey_season_stats, public.trainer_season_stats, public.horse_season_stats to anon, authenticated;
