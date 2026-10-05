-- Live chat is members-only.
--
-- components/LiveChat.tsx now opens the "live_chat_room" channel as a PRIVATE
-- channel. Supabase then checks the policies below on realtime.messages, so
-- anonymous visitors can neither read nor send chat messages — not even by
-- calling the Realtime API directly.
--
-- Also: Supabase Dashboard → Realtime → Settings → turn OFF "Allow public
-- access" so every channel requires authorization.

drop policy if exists "Members can receive live chat" on realtime.messages;
drop policy if exists "Members can send live chat" on realtime.messages;

create policy "Members can receive live chat"
on realtime.messages
for select
to authenticated
using ( realtime.topic() = 'live_chat_room' and realtime.messages.extension = 'broadcast' );

create policy "Members can send live chat"
on realtime.messages
for insert
to authenticated
with check ( realtime.topic() = 'live_chat_room' and realtime.messages.extension = 'broadcast' );
