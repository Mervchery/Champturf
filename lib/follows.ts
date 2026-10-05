import { createClient } from "@/lib/supabase/server";

// Everything here is per-member (reads the signed-in session), so it uses the
// cookie-based client — NOT the shared public cache client.

export type FollowedHorse = {
  horse_id: string;
  notify_runs: boolean;
  notify_odds: boolean;
  horse: { id: string; name: string; silk_image_url: string | null } | null;
};

export type AppNotification = {
  id: string;
  kind: "declared" | "odds" | "result";
  title: string;
  body: string;
  title_fr: string | null;
  body_fr: string | null;
  url: string;
  read_at: string | null;
  created_at: string;
};

/** Ids of the horses the signed-in member follows (empty set when signed out). */
export async function getFollowState(): Promise<{ signedIn: boolean; ids: Set<string> }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, ids: new Set() };
  const { data } = await supabase.from("horse_follows").select("horse_id").eq("user_id", user.id);
  return { signedIn: true, ids: new Set((data ?? []).map((r) => r.horse_id as string)) };
}

export async function getFollowedHorses(userId: string): Promise<FollowedHorse[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("horse_follows")
    .select("horse_id, notify_runs, notify_odds, created_at, horse:horses(id, name, silk_image_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data as any) ?? []) as FollowedHorse[];
}

export async function getNotifications(userId: string, limit = 20): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, title_fr, body_fr, url, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AppNotification[]) ?? [];
}
