-- Supertote shows 9999 for "no price yet". Older scrapes saved it as a real price, which made 9999
-- the "opening price" and produced fake firming moves. Clears those placeholders. Safe to re-run.
update public.race_entries set odds = null where odds ~ '^[0-9.]+$' and odds::numeric >= 9999;
update public.race_entries set place_odds = null where place_odds ~ '^[0-9.]+$' and place_odds::numeric >= 9999;
update public.race_entries set odds_open = null where odds_open ~ '^[0-9.]+$' and odds_open::numeric >= 9999;
update public.race_entries set place_odds_open = null where place_odds_open ~ '^[0-9.]+$' and place_odds_open::numeric >= 9999;
update public.race_entries set odds_prev = null where odds_prev ~ '^[0-9.]+$' and odds_prev::numeric >= 9999;
update public.race_entries set place_odds_prev = null where place_odds_prev ~ '^[0-9.]+$' and place_odds_prev::numeric >= 9999;
update public.race_results set win_odds = null where win_odds ~ '^[0-9.]+$' and win_odds::numeric >= 9999;
update public.race_results set place_odds = null where place_odds ~ '^[0-9.]+$' and place_odds::numeric >= 9999;
-- Where the opening price was lost, the first real price seen again becomes the opening price on the next scrape.
