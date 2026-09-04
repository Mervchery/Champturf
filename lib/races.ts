import { createClient } from "@/lib/supabase/server";

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

export type RaceEntry = {
  id: string;
  race_id: string;
  gate: number | null;
  horse_name: string;
  trainer: string | null;
};

export type RaceResult = {
  id: string;
  race_id: string;
  position: number;
  horse_name: string;
  jockey: string;
  finish_time: string | null;
};

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

export async function getEntriesForRace(raceId: string): Promise<RaceEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_entries")
    .select("*")
    .eq("race_id", raceId)
    .order("gate", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getResultsForRace(raceId: string): Promise<RaceResult[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_results")
    .select("*")
    .eq("race_id", raceId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
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
    .select("*")
    .in("race_id", races.map((r) => r.id))
    .order("position", { ascending: true });
  if (resultsError) throw resultsError;

  return races.map((r) => ({
    ...r,
    results: (results ?? []).filter((row) => row.race_id === r.id),
  }));
}
