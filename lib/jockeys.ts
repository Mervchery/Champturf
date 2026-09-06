import { createClient } from "@/lib/supabase/server";
import type { RefSummary } from "@/lib/horses";

export type Jockey = {
  id: string;
  name: string;
  nationality: string | null;
  wins: number;
  places: number;
  win_pct: number;
  rides: number;
  apprentice: boolean;
  bio: string | null;
  suspensions: number;
  achievements: string | null;
  mentor_id: string | null;
  mentor: RefSummary | null; // joined — always read this for display
  allowance: string | null;
  progress: string | null;
};

const JOCKEY_SELECT = "*, mentor:jockeys!mentor_id(id, name)";

export async function getJockeys(): Promise<Jockey[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("jockeys").select(JOCKEY_SELECT).order("wins", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function getJockeyById(id: string): Promise<Jockey | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("jockeys").select(JOCKEY_SELECT).eq("id", id).single();
  if (error) return null;
  return data as any;
}
