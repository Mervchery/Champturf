"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/i18n/server";

// Every action re-verifies the caller with auth.getUser() (a round-trip to Supabase
// Auth, not just a cookie read) and only ever touches rows with user_id = that user.
// RLS enforces the same rule in the database, so it is checked twice.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export type ToggleResult = { ok: true; following: boolean } | { ok: false; error: "auth" | "invalid" | "failed" };

/** Follow the horse if the member isn't following it, otherwise unfollow. */
export async function toggleFollow(horseId: string): Promise<ToggleResult> {
  if (!UUID.test(horseId)) return { ok: false, error: "invalid" };
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "auth" };

  const { data: existing } = await supabase
    .from("horse_follows").select("horse_id").eq("user_id", user.id).eq("horse_id", horseId).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("horse_follows").delete().eq("user_id", user.id).eq("horse_id", horseId);
    if (error) return { ok: false, error: "failed" };
    revalidatePath("/account");
    return { ok: true, following: false };
  }
  const { error } = await supabase.from("horse_follows").insert({ user_id: user.id, horse_id: horseId });
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/account");
  return { ok: true, following: true };
}

export async function setFollowPrefs(horseId: string, prefs: { notify_runs?: boolean; notify_odds?: boolean }): Promise<{ ok: boolean }> {
  if (!UUID.test(horseId)) return { ok: false };
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false };
  const update: { notify_runs?: boolean; notify_odds?: boolean } = {};
  if (typeof prefs.notify_runs === "boolean") update.notify_runs = prefs.notify_runs;
  if (typeof prefs.notify_odds === "boolean") update.notify_odds = prefs.notify_odds;
  if (Object.keys(update).length === 0) return { ok: false };
  const { error } = await supabase.from("horse_follows").update(update).eq("user_id", user.id).eq("horse_id", horseId);
  revalidatePath("/account");
  return { ok: !error };
}

type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Saves this device's push subscription. Same device re-subscribing just updates the row. */
export async function savePushSubscription(sub: PushSub, userAgent?: string): Promise<{ ok: boolean }> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 2000) return { ok: false };
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      lang: getLang(),
      user_agent: (userAgent ?? "").slice(0, 300),
    },
    { onConflict: "endpoint" }
  );
  revalidatePath("/account");
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  revalidatePath("/account");
  return { ok: !error };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/account");
  return { ok: !error };
}

export async function clearNotifications(): Promise<{ ok: boolean }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
  revalidatePath("/account");
  return { ok: !error };
}
