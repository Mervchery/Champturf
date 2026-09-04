import { createClient } from "@/lib/supabase/server";

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
  mentor: string | null;
  allowance: string | null;
  progress: string | null;
};

export async function getJockeys(): Promise<Jockey[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("jockeys").select("*").order("wins", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getJockeyById(id: string): Promise<Jockey | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("jockeys").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}
