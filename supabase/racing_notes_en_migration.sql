-- English translation of the scraped "Racing Notes" paragraph.
-- racing_notes stays as published (French); racing_notes_en is filled in by
-- the scraper (or `npm run translate-notes` for races already imported).
alter table public.races add column if not exists racing_notes_en text;
