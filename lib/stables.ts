import { createClient } from "@/lib/supabase/server";

export type SilkPattern = "plain" | "hoops" | "stripes" | "quarters" | "spots" | "sash" | "chevron";

export type Stable = {
  id: string;
  name: string;
  owner: string | null;
  location: string | null;
  horses: number;
  staff: number;
  gallery: number;
  trainers: string | null; // comma-separated
  silk_primary: string;
  silk_secondary: string;
  silk_cap: string;
  silk_pattern: SilkPattern;
};

export async function getStables(): Promise<Stable[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("stables").select("*").order("horses", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function getStableById(id: string): Promise<Stable | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("stables").select("*").eq("id", id).single();
  if (error) return null;
  return data as any;
}
