"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";

/** Re-checks admin role before every mutation. Supabase RLS (see
 *  supabase/races_schema.sql) enforces this too at the database level —
 *  this check just gives a clean error message instead of a raw RLS
 *  rejection, and fails closed if it can't confirm the role either way. */
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAdminRole(profile?.role)) throw new Error("Not authorized.");
  return supabase;
}

export type RaceInput = {
  name: string;
  course: string;
  race_date: string; // YYYY-MM-DD
  race_time: string; // HH:MM
  distance: string;
  prize: number;
  status: "upcoming" | "completed";
  conditions: string;
};

export async function createRace(input: RaceInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("races").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/races");
  revalidatePath("/");
}

export async function updateRace(id: string, input: Partial<RaceInput>) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("races").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/races");
  revalidatePath(`/races/${id}`);
  revalidatePath("/");
}

export async function deleteRace(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("races").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/races");
  revalidatePath("/");
}

export type ResultInput = {
  race_id: string;
  position: number;
  horse_id: string;
  jockey: string;
  finish_time: string;
};

/** Creates or overwrites the result row for a given race+position
 *  (race_results has a unique constraint on (race_id, position)). Horse
 *  stats (wins/seconds/thirds/unplaced/starts/earnings) update themselves
 *  automatically via a database trigger — nothing to do here. */
export async function upsertResult(input: ResultInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("race_results")
    .upsert(input, { onConflict: "race_id,position" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/results");
  revalidatePath("/horses");
  revalidatePath(`/races/${input.race_id}`);
  revalidatePath("/");
}

export async function deleteResult(id: string, raceId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("race_results").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/results");
  revalidatePath("/horses");
  revalidatePath(`/races/${raceId}`);
  revalidatePath("/");
}

export type EntryInput = {
  race_id: string;
  runner_no: number | null;
  gate: number | null;
  horse_id: string;
  jockey_id: string | null;
  weight_kg: number | null;
};

export async function createEntry(input: EntryInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("race_entries").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath(`/races/${input.race_id}`);
}

export async function deleteEntry(id: string, raceId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("race_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath(`/races/${raceId}`);
}
