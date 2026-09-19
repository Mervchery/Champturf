import { createClient } from "@/lib/supabase/server";

export type RecentResult = {
  position: number;
  raceId: string;
  raceName: string;
  raceDate: string;
  horseName: string;
  horseId: string;
};

export type CareerStats = {
  starts: number;
  wins: number;
  places: number; // 2nd + 3rd
  winPct: number;
  placePct: number;
  avgFinish: number | null;
  recentForm: string[];
  recentResults: RecentResult[];
};

async function computeFromResults(rows: any[]): Promise<CareerStats> {
  const starts = rows.length;
  const wins = rows.filter((r) => r.position === 1).length;
  const places = rows.filter((r) => r.position === 2 || r.position === 3).length;
  const winPct = starts > 0 ? Math.round((wins / starts) * 1000) / 10 : 0;
  const placePct = starts > 0 ? Math.round(((wins + places) / starts) * 1000) / 10 : 0;
  const avgFinish = starts > 0 ? Math.round((rows.reduce((s, r) => s + r.position, 0) / starts) * 10) / 10 : null;

  const sorted = [...rows].sort((a, b) => (b.races?.race_date ?? "").localeCompare(a.races?.race_date ?? ""));
  const recentForm = sorted.slice(0, 5).map((r) => String(r.position));
  const recentResults: RecentResult[] = sorted.slice(0, 8).map((r) => ({
    position: r.position,
    raceId: r.race_id,
    raceName: r.races?.name ?? "Unknown race",
    raceDate: r.races?.race_date ?? "",
    horseName: r.horses?.name ?? "Unknown horse",
    horseId: r.horse_id,
  }));

  return { starts, wins, places, winPct, placePct, avgFinish, recentForm, recentResults };
}

export async function getCareerStatsForTrainer(trainerId: string): Promise<CareerStats> {
  const supabase = createClient();
  const { data } = await supabase
    .from("race_results")
    .select("position, race_id, horse_id, races(name, race_date), horses(name)")
    .eq("trainer_id", trainerId);
  return computeFromResults(data ?? []);
}

export async function getCareerStatsForJockey(jockeyId: string): Promise<CareerStats> {
  const supabase = createClient();
  const { data } = await supabase
    .from("race_results")
    .select("position, race_id, horse_id, races(name, race_date), horses(name)")
    .eq("jockey_id", jockeyId);
  return computeFromResults(data ?? []);
}

/** A stable's results are its horses' results — race_results doesn't
 *  store stable_id directly (a horse's stable can change over time, same
 *  caveat as trainer_id historically), so this joins through horses. */
export async function getCareerStatsForStable(stableId: string): Promise<CareerStats> {
  const supabase = createClient();
  const { data } = await supabase
    .from("race_results")
    .select("position, race_id, horse_id, races(name, race_date), horses!inner(name, stable_id)")
    .eq("horses.stable_id", stableId);
  return computeFromResults(data ?? []);
}
