import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  role: string | null;
};

export async function getProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("id, email, role").order("email");
  if (error) throw error;
  return data ?? [];
}
