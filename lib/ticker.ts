import { createPublicClient as createClient } from "@/lib/supabase/public";

export type TickerItem = {
  id: string;
  text: string;
  sort_order: number;
};

export async function getTickerItems(): Promise<TickerItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ticker_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
