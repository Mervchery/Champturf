import { createClient } from "@/lib/supabase/server";
import type { RefSummary } from "@/lib/horses";

export type Trainer = {
  id: string;
  name: string;
  stable_id: string | null;
  stable: RefSummary | null; // joined — always read this for display
  wins: number;
  horses: number;
  ranking: number | null;
  achievements: string | null;
};

const TRAINER_SELECT = "*, stable:stables(id, name)";

export async function getTrainers(): Promise<Trainer[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("trainers").select(TRAINER_SELECT).order("wins", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}
