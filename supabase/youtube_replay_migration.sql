-- Run after all previous migrations. Stores the YouTube video ID for a
-- race's replay, once one has been found and saved (either pasted
-- manually or found via the "Auto-find on YouTube" admin action).
-- Nothing searches YouTube automatically on page views — see
-- lib/actions/youtube.ts for why.

alter table public.races add column if not exists youtube_video_id text;
