-- Run this after race_entries_results_migration.sql and
-- relational_links_migration.sql.
--
-- Why this is needed: race_results never had its own gate/runner_no
-- columns — the app used to look these up by joining to race_entries on
-- (race_id, horse_id). That works only when an entries row happens to
-- exist for that race. In practice the scraper writes straight to
-- race_results (skipping race_entries entirely) whenever it scrapes a
-- race that was *already* completed on the source site — see
-- scraper/scrape.mjs's `if (parsed.isResult)` branch, which never calls
-- upsertEntry. So for most real results there is no matching entries row,
-- and gate came out blank on the results pages.
--
-- Fix: race_results gets its own gate/runner_no columns, populated
-- directly by the scraper (parseRacePage.mjs already extracts gate for
-- every runner row, result pages included) and settable by hand from the
-- admin results editor. The old race_entries join stays in the app purely
-- as a fallback for legacy rows, so nothing existing regresses.

alter table public.race_results add column if not exists gate int;
alter table public.race_results add column if not exists runner_no int;

-- Best-effort backfill for rows written before this migration, wherever a
-- matching race_entries row happens to exist for the same race + horse.
update public.race_results r
set
  gate = coalesce(r.gate, e.gate),
  runner_no = coalesce(r.runner_no, e.runner_no)
from public.race_entries e
where e.race_id = r.race_id
  and e.horse_id = r.horse_id
  and (r.gate is null or r.runner_no is null);
