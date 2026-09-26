import { createClient } from "@/lib/supabase/server";
import type { RefSummary } from "@/lib/horses";
import type { SilkPattern } from "@/lib/stables";

export type StableSummary = RefSummary & {
  silk_primary: string;
  silk_secondary: string;
  silk_cap: string;
  silk_pattern: SilkPattern;
};

export type Trainer = {
  id: string;
  name: string;
  stable_id: string | null;
  stable: StableSummary | null; // joined — always read this for display
  wins: number;
  horses: number;
  ranking: number | null;
  achievements: string | null;
  photo_url: string | null;
};

const TRAINER_SELECT = "*, stable:stables!trainers_stable_id_fkey(id, name, silk_primary, silk_secondary, silk_cap, silk_pattern)";

export async function getTrainers(): Promise<Trainer[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("trainers").select(TRAINER_SELECT).order("wins", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function getTrainerById(id: string): Promise<Trainer | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("trainers").select(TRAINER_SELECT).eq("id", id).single();
  if (error) return null;
  return data as any;
}
