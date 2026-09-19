-- Run this SQL editor script any time you manually correct a horse's
-- trainer (e.g. after untangling a name collision like two different
-- trainers both showing as "R. Gujadhur"). It is NOT a one-time
-- migration — re-run it whenever you fix another horse's trainer.
--
-- What it does: for every horse whose current trainer_id doesn't match
-- what's stored on its own race_results/race_entries rows, it updates
-- those rows to match. This is a reasonable assumption for fixing a
-- name-collision mixup — it treats the horse's corrected trainer as
-- correct for that horse's whole history. If a horse has genuinely
-- changed trainers partway through its career (a different situation
-- from a name collision), this would incorrectly rewrite its earlier,
-- accurate results too — see the "Just some horses" version at the
-- bottom of this file if that's your situation instead.
--
-- Updating race_results.trainer_id fires the existing trigger that
-- recomputes both the old and new trainer's wins/horses stats
-- automatically — nothing else to run after this.

-- ---------------------------------------------------------------------
-- STEP 1 — Preview what would change before touching anything.
-- ---------------------------------------------------------------------

select
  h.name as horse_name,
  h.trainer_id as horse_current_trainer_id,
  t_current.name as horse_current_trainer_name,
  rr.id as race_result_id,
  rr.trainer_id as result_trainer_id,
  t_old.name as result_trainer_name,
  ra.name as race_name,
  ra.race_date
from public.race_results rr
join public.horses h on h.id = rr.horse_id
join public.races ra on ra.id = rr.race_id
left join public.trainers t_current on t_current.id = h.trainer_id
left join public.trainers t_old on t_old.id = rr.trainer_id
where h.trainer_id is not null
  and rr.trainer_id is distinct from h.trainer_id
order by h.name, ra.race_date;

-- ---------------------------------------------------------------------
-- STEP 2 — If that preview looks right, run this to actually apply it.
-- ---------------------------------------------------------------------

update public.race_results rr
set trainer_id = h.trainer_id
from public.horses h
where rr.horse_id = h.id
  and h.trainer_id is not null
  and rr.trainer_id is distinct from h.trainer_id;

update public.race_entries re
set trainer_id = h.trainer_id
from public.horses h
where re.horse_id = h.id
  and h.trainer_id is not null
  and re.trainer_id is distinct from h.trainer_id;

-- ---------------------------------------------------------------------
-- STEP 3 — Confirm the fix. Both Gujadhurs' wins/horses counts should
-- now reflect the corrected assignments.
-- ---------------------------------------------------------------------

select name, wins, horses, ranking from public.trainers where name ilike '%gujadhur%';

-- ---------------------------------------------------------------------
-- ALTERNATIVE: fixing only specific horses by name (safer if some
-- horses genuinely changed trainers mid-career and you don't want their
-- earlier results rewritten too — replace the list with your own horses).
-- ---------------------------------------------------------------------

-- update public.race_results rr
-- set trainer_id = h.trainer_id
-- from public.horses h
-- where rr.horse_id = h.id
--   and h.name in ('Horse Name One', 'Horse Name Two')
--   and h.trainer_id is not null
--   and rr.trainer_id is distinct from h.trainer_id;
--
-- update public.race_entries re
-- set trainer_id = h.trainer_id
-- from public.horses h
-- where re.horse_id = h.id
--   and h.name in ('Horse Name One', 'Horse Name Two')
--   and h.trainer_id is not null
--   and re.trainer_id is distinct from h.trainer_id;
