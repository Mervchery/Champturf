"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, type Role } from "@/lib/roles";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAdminRole(profile?.role)) throw new Error("Not authorized.");
  return { supabase, currentUserId: user.id };
}

/** Sets (or clears, with role="") another user's admin role. Kept separate
 *  from lib/actions/db.ts's generic table actions deliberately — `profiles`
 *  is not in that module's table whitelist, and role changes get one extra
 *  guardrail here: you can't remove your own admin access, so a Super Admin
 *  can't accidentally lock themselves out. */
export async function setUserRole(targetUserId: string, role: Role | "") {
  const { supabase, currentUserId } = await requireAdmin();
  if (targetUserId === currentUserId && role === "") {
    throw new Error("You can't remove your own admin role.");
  }
  const { error } = await supabase.from("profiles").update({ role: role || null }).eq("id", targetUserId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
