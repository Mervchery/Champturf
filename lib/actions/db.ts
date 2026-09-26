"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";

// Only these tables can be touched through this generic action module —
// prevents a crafted client call from targeting e.g. `profiles` even though
// RLS would already block that (defense in depth, not the only barrier).
const ALLOWED_TABLES = new Set([
  "horses", "jockeys", "trainers", "stables", "owners", "news", "streams", "meetings", "ticker_items",
]);

function assertAllowed(table: string) {
  if (!ALLOWED_TABLES.has(table)) throw new Error(`Table "${table}" is not editable through this action.`);
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAdminRole(profile?.role)) throw new Error("Not authorized.");
  return supabase;
}

function refresh(paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

export async function createRow(table: string, input: Record<string, unknown>, paths: string[]) {
  assertAllowed(table);
  const supabase = await requireAdmin();
  const { error } = await supabase.from(table).insert(input);
  if (error) throw new Error(error.message);
  refresh(paths);
}

export async function updateRow(table: string, id: string, input: Record<string, unknown>, paths: string[]) {
  assertAllowed(table);
  const supabase = await requireAdmin();
  const { error } = await supabase.from(table).update(input).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(paths);
}

export async function deleteRow(table: string, id: string, paths: string[]) {
  assertAllowed(table);
  const supabase = await requireAdmin();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh(paths);
}
