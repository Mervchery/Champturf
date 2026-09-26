import { createClient } from "@/lib/supabase/server";
import type { RefSummary } from "@/lib/horses";

export type SilkPattern = "plain" | "hoops" | "stripes" | "quarters" | "spots" | "sash" | "chevron";

export type Stable = {
  id: string;
  name: string;
  owner: string | null;
  location: string | null;
  horses: number;
  staff: number;
  gallery: number;
  // The trainer who runs this stable — see supabase/stable_trainer_link_migration.sql
  // for how this drives horses.stable_id automatically. `trainers` (the old
  // free-text comma-separated field) is kept only for any legacy data not
  // yet migrated to a real trainer link — new stables should use trainer_id.
  trainer_id: string | null;
  trainer: RefSummary | null; // joined — always read this for display, not the old `trainers` text field
  trainers: string | null; // comma-separated — legacy, superseded by trainer_id
  silk_primary: string;
  silk_secondary: string;
  silk_cap: string;
  silk_pattern: SilkPattern;
};

const STABLE_SELECT = "*, trainer:trainers(id, name)";

export async function getStables(): Promise<Stable[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("stables").select(STABLE_SELECT).order("horses", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function getStableById(id: string): Promise<Stable | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("stables").select(STABLE_SELECT).eq("id", id).single();
  if (error) return null;
  return data as any;
}
