"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";

/** Re-checks admin role before every mutation. Supabase RLS (see
 *  supabase/races_schema.sql) enforces this too at the database level —
 *  this check just gives a clean error message instead of a raw RLS
 *  rejection, and fails closed if it can't confirm the role either way. */
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAdminRole(profile?.role)) throw new Error("Not authorized.");
  return supabase;
}

export type RaceInput = {
  name: string;
  course: string;
  race_date: string; // YYYY-MM-DD
  race_time: string; // HH:MM
  distance: string;
  prize: number;
  status: "upcoming" | "completed";
  conditions: string;
};

export async function createRace(input: RaceInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("races").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/races");
  revalidatePath("/");
}

export async function updateRace(id: string, input: Partial<RaceInput>) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("races").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/races");
  revalidatePath(`/races/${id}`);
  revalidatePath("/");
}

export async function deleteRace(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("races").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/races");
  revalidatePath("/");
}

export type ResultInput = {
  race_id: string;
  position: number;
  horse_id: string;
  jockey: string;
  finish_time: string;
  margin?: string | null;
  starting_price?: string | null;
  performance_rating?: number | null;
  weight_kg?: number | null;
};

/** Creates or overwrites the result row for a given race+position
 *  (race_results has a unique constraint on (race_id, position)). Horse
 *  stats (wins/seconds/thirds/unplaced/starts/earnings) update themselves
 *  automatically via a database trigger — nothing to do here. */
export async function upsertResult(input: ResultInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("race_results")
    .upsert(input, { onConflict: "race_id,position" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/results");
  revalidatePath("/horses");
  revalidatePath(`/races/${input.race_id}`);
  revalidatePath("/");
}

export async function deleteResult(id: string, raceId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("race_results").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/results");
  revalidatePath("/horses");
  revalidatePath(`/races/${raceId}`);
  revalidatePath("/");
}

export type EntryInput = {
  race_id: string;
  runner_no: number | null;
  gate: number | null;
  horse_id: string;
  jockey_id: string | null;
  weight_kg: number | null;
  odds?: string | null;
};

export async function createEntry(input: EntryInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("race_entries").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath(`/races/${input.race_id}`);
}

export async function deleteEntry(id: string, raceId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("race_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath(`/races/${raceId}`);
}

// ---------------------------------------------------------------------
// YouTube replay video — see lib/youtube.ts for URL parsing and
// README.md's "Race replays (YouTube)" section for setup/quota notes.
// ---------------------------------------------------------------------

/** Saves a video ID directly — used when an admin pastes a URL they
 *  found themselves, no API call involved. */
export async function setRaceVideo(raceId: string, videoId: string | null) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("races").update({ youtube_video_id: videoId }).eq("id", raceId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath(`/races/${raceId}`);
}

/** Searches YouTube for a race's replay and saves the top match. Requires
 *  YOUTUBE_API_KEY to be set — throws a clear error if it isn't, rather
 *  than failing silently. Each call costs real API quota (100 of the
 *  free tier's 10,000 daily units), so this only ever runs when an admin
 *  explicitly clicks the button — never automatically on a page view. */
export async function findRaceVideoOnYoutube(raceId: string, query: string) {
  const supabase = await requireAdmin();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY isn't set — see README.md's Race replays section to add one, or paste a video URL manually instead.");
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "YouTube search failed.");
  }
  const videoId: string | undefined = data?.items?.[0]?.id?.videoId;
  if (!videoId) {
    throw new Error("No matching video found on YouTube for this search.");
  }

  const { error } = await supabase.from("races").update({ youtube_video_id: videoId }).eq("id", raceId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath(`/races/${raceId}`);
  return videoId;
}
