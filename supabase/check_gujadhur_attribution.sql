-- 1) 2026-only starts/wins per Gujadhur (compare with MTC: Ramapatee 31 wins / 117 starts)
select t.name, count(*) as starts, count(*) filter (where rr.position = 1) as wins
from public.race_results rr
join public.races r on r.id = rr.race_id
join public.trainers t on t.id = rr.trainer_id
where t.normalized_name like '%gujadhur%' and r.race_date >= '2026-01-01'
group by t.name order by t.name;

-- 2) Results credited to the WRONG Gujadhur (horse is on the override list for the other one)
with ov(horse, trainer) as (values
  ('rapidash', 'Rameshwar Gujadhur'),
  ('future swing', 'Rameshwar Gujadhur'),
  ('afrique', 'Ramapatee Gujadhur'),
  ('allez moris', 'Ramapatee Gujadhur'),
  ('amancio', 'Ramapatee Gujadhur'),
  ('ashikule', 'Ramapatee Gujadhur'),
  ('at my command', 'Ramapatee Gujadhur'),
  ('blue bay', 'Ramapatee Gujadhur'),
  ('boardwalk breeze', 'Ramapatee Gujadhur'),
  ('boom town', 'Ramapatee Gujadhur'),
  ('courtly', 'Ramapatee Gujadhur'),
  ('crescent', 'Ramapatee Gujadhur'),
  ('diamond days', 'Ramapatee Gujadhur'),
  ('future frequency', 'Ramapatee Gujadhur'),
  ('grand bay', 'Ramapatee Gujadhur'),
  ('join the dots', 'Ramapatee Gujadhur'),
  ('let it be said', 'Ramapatee Gujadhur'),
  ('makazole', 'Ramapatee Gujadhur'),
  ('mercenary', 'Ramapatee Gujadhur'),
  ('midnight flyer', 'Ramapatee Gujadhur'),
  ('montien', 'Ramapatee Gujadhur'),
  ('monumental', 'Ramapatee Gujadhur'),
  ('moonlight trader', 'Ramapatee Gujadhur'),
  ('new world', 'Ramapatee Gujadhur'),
  ('paved with gold', 'Ramapatee Gujadhur'),
  ('port louis', 'Ramapatee Gujadhur'),
  ('river hawk', 'Ramapatee Gujadhur'),
  ('smarten up', 'Ramapatee Gujadhur'),
  ('soldier boy', 'Ramapatee Gujadhur'),
  ('sun blushed', 'Ramapatee Gujadhur'),
  ('taskmaster', 'Ramapatee Gujadhur'),
  ('the centurion', 'Ramapatee Gujadhur'),
  ('the mauritian', 'Ramapatee Gujadhur'),
  ('view of the world', 'Ramapatee Gujadhur'),
  ('wugug', 'Ramapatee Gujadhur'),
  ('zeus', 'Ramapatee Gujadhur'),
  ('zil moris', 'Ramapatee Gujadhur'),
  ('zoomie', 'Ramapatee Gujadhur')
)
select ov.trainer as should_be, t.name as credited_to, count(*) as results,
       count(*) filter (where rr.position = 1) as wins
from public.race_results rr
join public.horses h on h.id = rr.horse_id
join ov on public.normalize_name(h.name) = public.normalize_name(ov.horse)
join public.trainers t on t.id = rr.trainer_id
where public.normalize_name(t.name) <> public.normalize_name(ov.trainer)
group by 1, 2 order by 1, 2;
