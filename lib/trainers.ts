import { createClient } from "@/lib/supabase/server";

export type Trainer = {
  id: string;
  name: string;
  stable: string | null;
  wins: number;
  horses: number;
  ranking: number | null;
  achievements: string | null;
};

export async function getTrainers(): Promise<Trainer[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("trainers").select("*").order("wins", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
