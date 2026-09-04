import { createClient } from "@/lib/supabase/server";

export type NewsArticle = {
  id: string;
  category: string;
  title: string;
  article_date: string;
  excerpt: string | null;
};

export async function getNews(): Promise<NewsArticle[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("news").select("*").order("article_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
