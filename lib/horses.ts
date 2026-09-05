import { createClient } from "@/lib/supabase/server";

export type Horse = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  breed: string | null;
  color: string | null;
  origin: string | null;
  owner: string | null;
  trainer: string | null;
  stable: string | null;
  // wins/seconds/thirds/unplaced/starts/earnings are NOT hand-edited —
  // they're maintained automatically by a database trigger whenever
  // race_results changes (see supabase/race_entries_results_migration.sql).
  // Treat these as read-only in the app; there is no write path for them
  // other than entering/editing official results.
  wins: number;
  seconds: number;
  thirds: number;
  unplaced: number;
  starts: number;
  earnings: number;
  medical_status: string | null;
};

export async function getHorses(): Promise<Horse[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("horses").select("*").order("wins", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getHorseById(id: string): Promise<Horse | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("horses").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

/** Last 5 finishes for this horse, joined via the real horse_id foreign
 *  key on race_results (no more name-matching). */
export async function getRecentForm(horseId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_results")
    .select("position, races(race_date)")
    .eq("horse_id", horseId);
  if (error || !data) return [];
  const sorted = [...data].sort((a: any, b: any) => (b.races?.race_date ?? "").localeCompare(a.races?.race_date ?? ""));
  return sorted.slice(0, 5).map((row: any) => String(row.position));
}
