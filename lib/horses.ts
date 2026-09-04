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
  wins: number;
  places: number;
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

/** Last 5 finishes for this horse, computed by matching horse_name against
 *  race_results — no horse_id foreign key needed, since races_schema.sql
 *  stores results as plain text. Sorted client-side after the join since
 *  ordering by an embedded resource's column isn't reliably supported by
 *  the query builder. */
export async function getRecentForm(horseName: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_results")
    .select("position, races(race_date)")
    .eq("horse_name", horseName);
  if (error || !data) return [];
  const sorted = [...data].sort((a: any, b: any) => (b.races?.race_date ?? "").localeCompare(a.races?.race_date ?? ""));
  return sorted.slice(0, 5).map((row: any) => String(row.position));
}
