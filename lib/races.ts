import { createClient } from "@/lib/supabase/server";
import type { RefSummary } from "@/lib/horses";
import type { StableSummary } from "@/lib/trainers";

export type Race = {
  id: string;
  name: string;
  course: string;
  race_date: string;
  race_time: string;
  distance: string;
  prize: number;
  status: "upcoming" | "completed";
  conditions: string | null;
  youtube_video_id: string | null;
};

// A "runner" is a horse joined with race-specific details (gate/jockey/
// weight for entries, or position/time for results) plus the horse's own
// connections (owner/trainer/stable are each nested joins in turn, since
// the horse itself only stores their ids — see relational_links_migration.sql).
// silk_image_url is the real scraped silk artwork for this horse (see
// scraper/lib/parseRacePage.mjs) — display that directly rather than
// deriving colors from the stable.
export type HorseSummary = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  rating: number | null;
  silk_image_url: string | null;
  owner: RefSummary | null;
  trainer: RefSummary | null;
  stable: StableSummary | null;
  // Career record — trigger-maintained on the horses table itself (see
  // supabase/race_entries_results_migration.sql), so no extra query needed
  // to show a form snapshot alongside a declared runner.
  wins: number;
  seconds: number;
  thirds: number;
  starts: number;
  earnings: number;
};

export type RaceEntry = {
  id: string;
  race_id: string;
  runner_no: number | null;
  gate: number | null;
  weight_kg: number | null;
  // Two Mauritian tote/wagering channels, shown side by side on the
  // racecard — `odds` is the MTC tote price, `sms_odds` the SMS Pariaz
  // price (see supabase/entries_sms_odds_migration.sql).
  odds: string | null;
  sms_odds: string | null;
  horse_id: string;
  horses: HorseSummary | null; // joined
  jockey_id: string | null;
  jockeys: { id: string; name: string } | null; // joined
};

export type RaceResult = {
  id: string;
  race_id: string;
  position: number;
  jockey: string;
  finish_time: string | null;
  margin: string | null;
  weight_kg: number | null;
  starting_price: string | null;
  performance_rating: number | null;
  horse_id: string;
  horses: HorseSummary | null; // joined
  jockey_id: string | null;
  jockeys: { id: string; name: string } | null; // joined
  trainer_id: string | null;
  trainers: RefSummary | null; // joined
  // Gate/racecard-No for this result. A real race_results column (see
  // supabase/race_results_gate_migration.sql) written directly by the
  // scraper/admin — not derived from race_entries at request time, since a
  // race scraped as already-completed never gets an entries row at all.
  runner_no: number | null;
  gate: number | null;
};

// Exported so any other query embedding horses (the admin panel, most
// notably) stays in lockstep with this shape instead of keeping its own
// copy that can silently drift out of sync with the schema.
export const HORSE_JOIN = "horses(id, name, age, sex, rating, silk_image_url, wins, seconds, thirds, starts, earnings, owner:owners(id, name), trainer:trainers(id, name), stable:stables(id, name, silk_primary, silk_secondary, silk_cap, silk_pattern))";
const ENTRY_SELECT = `*, ${HORSE_JOIN}, jockeys(id, name)`;
const RESULT_SELECT = `*, ${HORSE_JOIN}, jockeys(id, name), trainers(id, name)`;

export async function getRaces(): Promise<Race[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("races")
    .select("*")
    .order("race_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRaceById(id: string): Promise<Race | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("races").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export async function getRacesForDate(raceDate: string): Promise<Race[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("races")
    .select("*")
    .eq("race_date", raceDate)
    .order("race_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Mauritian meetings run to a fixed card, and by local convention the
 *  featured race of the day is always Race 6 — not whichever race happens
 *  to carry the biggest purse. `races` must already be ordered by
 *  race_time for one meeting (as getRacesForDate returns them), so index 5
 *  is the 6th race of the day; falls back to the day's last race if fewer
 *  than six are scheduled. */
export function pickFeaturedRace(races: Race[]): Race | null {
  if (races.length === 0) return null;
  return races[5] ?? races[races.length - 1];
}

export async function getEntriesForRace(raceId: string): Promise<RaceEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_entries")
    .select(ENTRY_SELECT)
    // Racecard order: the declared "No", not the gate/barrier draw —
    // nulls (no number assigned yet) sort to the end instead of the top.
    .order("runner_no", { ascending: true, nullsFirst: false })
    .eq("race_id", raceId);
  if (error) throw error;
  return (data as any) ?? [];
}

/** Fallback only: fills in gate/runner_no from a matching race_entries row
 *  (same race_id + horse_id) wherever a result doesn't already have its own
 *  value. Since the migration in supabase/race_results_gate_migration.sql,
 *  race_results carries these directly (populated by the scraper/admin at
 *  write time) — this just covers any older rows saved before that. */
async function attachEntryInfo(results: RaceResult[]): Promise<RaceResult[]> {
  if (results.length === 0) return [];
  if (results.every((r) => r.gate != null && r.runner_no != null)) return results;

  const supabase = createClient();
  const raceIds = [...new Set(results.map((r) => r.race_id))];
  const { data: entries, error } = await supabase
    .from("race_entries")
    .select("race_id, horse_id, runner_no, gate")
    .in("race_id", raceIds);
  if (error) throw error;
  const byKey = new Map((entries ?? []).map((e) => [`${e.race_id}:${e.horse_id}`, e]));
  return results.map((r) => {
    if (r.gate != null && r.runner_no != null) return r;
    const entry = byKey.get(`${r.race_id}:${r.horse_id}`);
    return {
      ...r,
      runner_no: r.runner_no ?? entry?.runner_no ?? null,
      gate: r.gate ?? entry?.gate ?? null,
    };
  });
}

export async function getResultsForRace(raceId: string): Promise<RaceResult[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_results")
    .select(RESULT_SELECT)
    .eq("race_id", raceId)
    .order("position", { ascending: true });
  if (error) throw error;
  return attachEntryInfo((data as any) ?? []);
}

/** Races with status='completed', each pre-loaded with its result rows —
 *  used by the results centre and home page's "recent results". */
export async function getCompletedRacesWithResults(): Promise<(Race & { results: RaceResult[] })[]> {
  const supabase = createClient();
  const { data: races, error } = await supabase
    .from("races")
    .select("*")
    .eq("status", "completed")
    .order("race_date", { ascending: false });
  if (error) throw error;
  if (!races?.length) return [];

  const { data: results, error: resultsError } = await supabase
    .from("race_results")
    .select(RESULT_SELECT)
    .in("race_id", races.map((r) => r.id))
    .order("position", { ascending: true });
  if (resultsError) throw resultsError;

  const withEntryInfo = await attachEntryInfo((results as any) ?? []);
  return races.map((r) => ({
    ...r,
    results: withEntryInfo.filter((row) => row.race_id === r.id),
  }));
}
