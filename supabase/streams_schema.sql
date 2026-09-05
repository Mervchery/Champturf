-- Run this after schema.sql, races_schema.sql, and entities_schema.sql
-- (depends on public.is_admin() from races_schema.sql, and optionally on
-- races.id if you link a stream to a race).

create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  race_id uuid references public.races (id) on delete set null,
  source text not null default 'youtube' check (source in ('youtube', 'facebook', 'twitch', 'rtmp')),
  embed_url text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'ended')),
  created_at timestamptz not null default now()
);

alter table public.streams enable row level security;

create policy "Public read streams" on public.streams for select using (true);
create policy "Admins write streams" on public.streams for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- IMPORTANT — embed_url must already be an embeddable URL for its
-- source, not a normal watch-page link:
--   youtube:  https://www.youtube.com/embed/VIDEO_ID
--   facebook: https://www.facebook.com/plugins/video.php?href=<url-encoded video URL>
--   twitch:   https://player.twitch.tv/?channel=CHANNEL&parent=your-domain.com
--   rtmp:     a direct .m3u8 HLS stream URL (played via <video>, native
--             HLS support varies by browser — see README)
-- ---------------------------------------------------------------------
