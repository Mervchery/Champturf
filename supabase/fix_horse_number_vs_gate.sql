-- Run ONCE in the Supabase SQL editor, then re-scrape (without --fast) so gates fill in.
-- Old scrapes saved the horse's number (.r-number) into `gate`. Move it to runner_no and
-- clear gate; the next full scrape writes the real gate (.r-lane).
update public.race_entries set runner_no = gate, gate = null where gate is not null;
update public.race_results set runner_no = gate, gate = null where gate is not null;
