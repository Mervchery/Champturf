import { createClient } from "@/lib/supabase/server";

export type Stream = {
  id: string;
  race_id: string | null;
  source: "youtube" | "facebook" | "twitch" | "rtmp";
  embed_url: string;
  status: "scheduled" | "active" | "ended";
};

export async function getStreams(): Promise<Stream[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("streams").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** The stream to show on /live — the most recently created one marked
 *  'active', or null if nothing is live right now. */
export async function getActiveStream(): Promise<Stream | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("streams")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
