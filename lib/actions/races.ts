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

export type YoutubeSearchResult =
  | { ok: true; videoId: string }
  | { ok: false; error: string };

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return Infinity;
  const [, h, min, s] = m;
  return (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
}

const MAX_REPLAY_SECONDS = 5 * 60;
const PUBLISH_WINDOW_DAYS_AFTER = 14;

/** Searches YouTube for a race's replay and saves the best match, then
 *  saves it. Requires YOUTUBE_API_KEY. Each call costs real API quota
 *  (roughly 100 units for the search + 1 for the duration lookup, out of
 *  the free tier's 10,000/day), so this only runs when an admin clicks
 *  the button — never automatically on a page view.
 *
 *  Two refinements beyond a plain text search:
 *  - `publishedAfter`/`publishedBefore` restrict results to videos
 *    uploaded within PUBLISH_WINDOW_DAYS_AFTER days of raceDate. Race
 *    names recur every year, and replay uploaders almost never put the
 *    literal date in the title, so filtering by *upload* date is a far
 *    more reliable way to disambiguate "which year" than text-matching
 *    a date string that likely isn't there.
 *  - Candidates are checked against videos.list for their real duration
 *    and anything over MAX_REPLAY_SECONDS is skipped, so a multi-hour
 *    full race-day broadcast doesn't get linked instead of the short
 *    single-race highlight clip.
 *
 *  Returns a result object instead of throwing for expected failure cases
 *  (missing key, no match, YouTube API error). Next.js redacts the message
 *  of any error *thrown* from a Server Action in production builds — so a
 *  thrown Error here would always surface as a generic "error in Server
 *  Components render" message client-side, no matter what it says. Only
 *  genuinely unexpected failures (the admin check, the Supabase write)
 *  still throw, since those aren't meant to be shown verbatim anyway. */
export async function findRaceVideoOnYoutube(raceId: string, query: string, raceDate?: string): Promise<YoutubeSearchResult> {
  const supabase = await requireAdmin();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "YOUTUBE_API_KEY isn't set — see README.md's Race replays section to add one, or paste a video URL manually instead." };
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "10");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);
  if (raceDate) {
    const after = new Date(`${raceDate}T00:00:00Z`);
    const before = new Date(after.getTime() + PUBLISH_WINDOW_DAYS_AFTER * 86400_000);
    searchUrl.searchParams.set("publishedAfter", after.toISOString());
    searchUrl.searchParams.set("publishedBefore", before.toISOString());
  }

  const searchRes = await fetch(searchUrl.toString());
  const searchData = await searchRes.json();
  if (!searchRes.ok) {
    return { ok: false, error: searchData?.error?.message || "YouTube search failed." };
  }
  const candidateIds: string[] = (searchData?.items ?? [])
    .map((item: any) => item?.id?.videoId)
    .filter(Boolean);
  if (candidateIds.length === 0) {
    const window = raceDate ? ` uploaded within ${PUBLISH_WINDOW_DAYS_AFTER} days of the race` : "";
    return { ok: false, error: `No video found${window} for "${query}". Try widening the query, or paste a URL manually.` };
  }

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.searchParams.set("part", "contentDetails");
  detailsUrl.searchParams.set("id", candidateIds.join(","));
  detailsUrl.searchParams.set("key", apiKey);
  const detailsRes = await fetch(detailsUrl.toString());
  const detailsData = await detailsRes.json();
  if (!detailsRes.ok) {
    return { ok: false, error: detailsData?.error?.message || "Couldn't check video lengths." };
  }
  const durationById = new Map<string, number>(
    (detailsData?.items ?? []).map((item: any) => [item.id, parseIsoDuration(item?.contentDetails?.duration || "")])
  );

  const videoId = candidateIds.find((id) => (durationById.get(id) ?? Infinity) <= MAX_REPLAY_SECONDS);
  if (!videoId) {
    return { ok: false, error: `Found ${candidateIds.length} video(s) for "${query}", but all were longer than 5 minutes (likely full race-day broadcasts). Try pasting a URL manually.` };
  }

  const { error } = await supabase.from("races").update({ youtube_video_id: videoId }).eq("id", raceId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath(`/races/${raceId}`);
  return { ok: true, videoId };
}
