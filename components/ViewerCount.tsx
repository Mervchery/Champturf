"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Counts open tabs on the live page using Supabase Realtime Presence.
// It uses its own channel so it keeps working even if chat is down.
// Free-plan note: presence is limited to 20 messages/sec, so a huge burst
// of people joining at once can briefly lag the number — it self-corrects.
export default function ViewerCount() {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const key =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    const channel = supabase.channel("live_viewers", {
      config: { presence: { key } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Hidden until the first sync so it never flashes "0 watching"
  if (count === null) return null;

  return (
    <div
      className="absolute top-3.5 right-3.5 z-10 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm"
      aria-live="polite"
    >
      <Eye size={12} />
      {count.toLocaleString()} watching
    </div>
  );
}
