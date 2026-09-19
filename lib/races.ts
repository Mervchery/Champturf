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
};

// A "runner" is a horse joined with race-specific details (gate/jockey/
// weight for entries, or position/time for results) plus the horse's own
// connections (owner/trainer/stable are each nested joins in turn, since
// the horse itself only stores their ids — see relational_links_migration.sql).
export type HorseSummary = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  rating: number | null;
  owner: RefSummary | null;
  trainer: RefSummary | null;
  stable: StableSummary | null;
};

export type RaceEntry = {
  id: string;
  race_id: string;
  runner_no: number | null;
  gate: number | null;
  weight_kg: number | null;
  odds: string | null;
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
};

const HORSE_JOIN = "horses(id, name, age, sex, rating, owner:owners(id, name), trainer:trainers(id, name), stable:stables(id, name, silk_primary, silk_secondary, silk_cap, silk_pattern))";
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

export async function getEntriesForRace(raceId: string): Promise<RaceEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_entries")
    .select(ENTRY_SELECT)
    .eq("race_id", raceId)
    .order("gate", { ascending: true });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function getResultsForRace(raceId: string): Promise<RaceResult[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_results")
    .select(RESULT_SELECT)
    .eq("race_id", raceId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as any) ?? [];
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

  return races.map((r) => ({
    ...r,
    results: ((results as any) ?? []).filter((row: RaceResult) => row.race_id === r.id),
  }));
}
