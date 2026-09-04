import { createClient } from "@/lib/supabase/server";

export type Stable = {
  id: string;
  name: string;
  owner: string | null;
  location: string | null;
  horses: number;
  staff: number;
  gallery: number;
  trainers: string | null; // comma-separated
};

export async function getStables(): Promise<Stable[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("stables").select("*").order("horses", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
