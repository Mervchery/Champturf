import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

// Rebuilt at most hourly — plenty for search engines, and keeps database load nil.
export const revalidate = 3600;

type Row = { id: string; updated_at?: string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const supabase = createPublicClient();
  const now = new Date();

  const [races, horses, jockeys, trainers, stables] = await Promise.all([
    supabase.from("races").select("id, race_date, status").order("race_date", { ascending: false }).limit(5000),
    supabase.from("horses").select("id").limit(10000),
    supabase.from("jockeys").select("id").limit(2000),
    supabase.from("trainers").select("id").limit(2000),
    supabase.from("stables").select("id").limit(2000),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1, lastModified: now },
    { url: `${base}/race-days`, changeFrequency: "hourly", priority: 0.9, lastModified: now },
    { url: `${base}/results`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${base}/horses`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/jockeys`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/trainers`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/stables`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/owners`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${base}/news`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/stats`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/live`, changeFrequency: "daily", priority: 0.5 },
  ];

  const raceDays = [...new Set((races.data ?? []).map((r) => r.race_date as string))];
  const upcomingDays = new Set((races.data ?? []).filter((r) => r.status === "upcoming").map((r) => r.race_date as string));

  const raceDayPages: MetadataRoute.Sitemap = raceDays.map((d) => ({
    url: `${base}/race-days/${d}`,
    lastModified: new Date(`${d}T12:00:00+04:00`),
    changeFrequency: upcomingDays.has(d) ? "hourly" : "monthly",
    priority: upcomingDays.has(d) ? 0.9 : 0.6,
  }));

  const racePages: MetadataRoute.Sitemap = (races.data ?? []).map((r) => ({
    url: `${base}/races/${r.id}`,
    lastModified: new Date(`${r.race_date}T12:00:00+04:00`),
    changeFrequency: r.status === "upcoming" ? "hourly" : "monthly",
    priority: r.status === "upcoming" ? 0.9 : 0.5,
  }));

  const entityPages = (path: string, rows: Row[] | null, priority: number): MetadataRoute.Sitemap =>
    (rows ?? []).map((r) => ({ url: `${base}/${path}/${r.id}`, changeFrequency: "weekly", priority }));

  return [
    ...staticPages,
    ...raceDayPages,
    ...racePages,
    ...entityPages("horses", horses.data, 0.6),
    ...entityPages("jockeys", jockeys.data, 0.5),
    ...entityPages("trainers", trainers.data, 0.5),
    ...entityPages("stables", stables.data, 0.4),
  ];
}
