import { createPublicClient as createClient } from "@/lib/supabase/public";

export type Owner = {
  id: string;
  name: string;
  horses: number;
  wins: number;
  achievements: string | null;
};

export async function getOwners(): Promise<Owner[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("owners").select("*").order("wins", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
