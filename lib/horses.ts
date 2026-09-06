import { createClient } from "@/lib/supabase/server";

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
  // FK ids — used by the admin edit form's dropdowns.
  owner_id: string | null;
  trainer_id: string | null;
  stable_id: string | null;
  // Joined display data — always read these for showing a horse's
  // connections, never the *_id fields directly, so renaming an owner/
  // trainer/stable anywhere updates every horse automatically.
  owner: RefSummary | null;
  trainer: RefSummary | null;
  stable: RefSummary | null;
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

const HORSE_SELECT = "*, owner:owners(id, name), trainer:trainers(id, name), stable:stables(id, name)";

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

/** Last 5 finishes for this horse, joined via the real horse_id foreign
 *  key on race_results. */
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
