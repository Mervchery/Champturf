import { createClient } from "@/lib/supabase/server";
import type { StableSummary } from "@/lib/trainers";

export type RefSummary = { id: string; name: string };

export type Horse = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  breed: string | null;
  color: string | null;
  origin: string | null;
  medical_status: string | null;
  rating: number | null;
  photo_url: string | null;
  // The actual silk artwork for this horse, scraped from supertote.mu
  // (see scraper/lib/parseRacePage.mjs) — this is the real image, not a
  // generated approximation, so it already reflects the owner's actual
  // colors/cap regardless of which stable trains the horse. Null until
  // the scraper has seen this horse run at least once.
  silk_image_url: string | null;
  // FK ids — used by the admin edit form's dropdowns.
  owner_id: string | null;
  trainer_id: string | null;
  stable_id: string | null;
  // Joined display data — always read these for showing a horse's
  // connections, never the *_id fields directly, so renaming an owner/
  // trainer/stable anywhere updates every horse automatically.
  owner: RefSummary | null;
  trainer: RefSummary | null;
  stable: StableSummary | null;
  // wins/seconds/thirds/unplaced/starts/earnings are NOT hand-edited —
  // they're maintained automatically by a database trigger whenever
  // race_results changes (see supabase/race_entries_results_migration.sql).
  wins: number;
  seconds: number;
  thirds: number;
  unplaced: number;
  starts: number;
  earnings: number;
};

const HORSE_SELECT = "*, owner:owners(id, name), trainer:trainers(id, name), stable:stables(id, name, silk_primary, silk_secondary, silk_cap, silk_pattern)";

export async function getHorses(): Promise<Horse[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("horses").select(HORSE_SELECT).order("wins", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function getHorseById(id: string): Promise<Horse | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("horses").select(HORSE_SELECT).eq("id", id).single();
  if (error) return null;
  return data as any;
}

export type FormEntry = { position: number; raceId: string; raceName: string; raceDate: string };

/** Last 5 finishes for this horse, joined via the real horse_id foreign
 *  key on race_results. */
export async function getRecentForm(horseId: string): Promise<string[]> {
  const entries = await getRecentFormDetailed(horseId);
  return entries.map((e) => String(e.position));
}

/** Same as getRecentForm but with the race context attached, for pages
 *  that want to link each form result to the race it happened in. */
export async function getRecentFormDetailed(horseId: string): Promise<FormEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_results")
    .select("position, race_id, races(name, race_date)")
    .eq("horse_id", horseId);
  if (error || !data) return [];
  const mapped = (data as any[]).map((row) => ({
    position: row.position,
    raceId: row.race_id,
    raceName: row.races?.name ?? "Unknown race",
    raceDate: row.races?.race_date ?? "",
  }));
  mapped.sort((a, b) => b.raceDate.localeCompare(a.raceDate));
  return mapped.slice(0, 5);
}
