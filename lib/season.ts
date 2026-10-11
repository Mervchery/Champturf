import { createPublicClient as createClient } from "@/lib/supabase/public";

/** Racing seasons are calendar years in Mauritius. The "current season" is the year of the most recent
 *  finished race, so the off-season (Dec–Mar) still shows the season that just ended until the first
 *  race of the new year is run — then everything resets. */
export type SeasonCtx = { year: number; raceDays: number; young: boolean; activeYears: number[] };
export type Line = { runs: number; wins: number; places: number; seconds?: number; thirds?: number };

export type SeasonBoard = {
  available: boolean; // false until supabase/season_stats_migration.sql has been run — pages fall back to all-time
  ctx: SeasonCtx;
  jockey: Map<string, Line>;   // this season only
  trainer: Map<string, Line>;
  horse: Map<string, Line>;
  activeJockeys: Set<string>;  // rode in the current season (or, very early in a season, the one before)
  activeTrainers: Set<string>;
};

const YOUNG_SEASON_DAYS = 4; // until this many race days are run, last season still counts for "active"

async function fetchAll(build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function getSeasonContext(): Promise<SeasonCtx> {
  const supabase = createClient();
  const { data } = await supabase.from("races").select("race_date").eq("status", "completed").order("race_date", { ascending: false }).limit(1);
  const latest = data?.[0]?.race_date as string | undefined;
  const year = latest ? Number(latest.slice(0, 4)) : new Date().getFullYear();
  const dates = await fetchAll((a, b) =>
    supabase.from("races").select("race_date").eq("status", "completed").gte("race_date", `${year}-01-01`).lte("race_date", `${year}-12-31`).order("race_date").range(a, b));
  const raceDays = new Set(dates.map((d) => d.race_date)).size;
  const young = raceDays < YOUNG_SEASON_DAYS;
  return { year, raceDays, young, activeYears: young ? [year - 1, year] : [year] };
}

export async function getSeasonBoard(): Promise<SeasonBoard> {
  const empty: SeasonBoard = {
    available: false, ctx: { year: new Date().getFullYear(), raceDays: 0, young: true, activeYears: [] },
    jockey: new Map(), trainer: new Map(), horse: new Map(), activeJockeys: new Set(), activeTrainers: new Set(),
  };
  try {
    const supabase = createClient();
    const ctx = await getSeasonContext();
    const years = ctx.activeYears;
    const [j, tr, h] = await Promise.all([
      fetchAll((a, b) => supabase.from("jockey_season_stats").select("*").in("season", years).order("jockey_id").range(a, b)),
      fetchAll((a, b) => supabase.from("trainer_season_stats").select("*").in("season", years).order("trainer_id").range(a, b)),
      fetchAll((a, b) => supabase.from("horse_season_stats").select("*").eq("season", ctx.year).order("horse_id").range(a, b)),
    ]);
    const board: SeasonBoard = { ...empty, available: true, ctx };
    for (const r of j) {
      board.activeJockeys.add(r.jockey_id);
      if (r.season === ctx.year) board.jockey.set(r.jockey_id, { runs: r.rides, wins: r.wins, places: r.places });
    }
    for (const r of tr) {
      board.activeTrainers.add(r.trainer_id);
      if (r.season === ctx.year) board.trainer.set(r.trainer_id, { runs: r.runners, wins: r.wins, places: r.places });
    }
    for (const r of h) board.horse.set(r.horse_id, { runs: r.starts, wins: r.wins, places: r.seconds + r.thirds, seconds: r.seconds, thirds: r.thirds });
    return board;
  } catch {
    return empty;
  }
}

const NONE: Line = { runs: 0, wins: 0, places: 0 };
export const lineOf = (m: Map<string, Line>, id: string): Line => m.get(id) ?? NONE;

/** Championship order: season wins, then places, then fewer runs (better strike rate), then name. */
export function bySeason<T extends { id: string; name: string }>(items: T[], m: Map<string, Line>): T[] {
  return [...items].sort((a, b) => {
    const x = lineOf(m, a.id), y = lineOf(m, b.id);
    return y.wins - x.wins || y.places - x.places || x.runs - y.runs || a.name.localeCompare(b.name);
  });
}

export type SeasonRow = { season: number; runs: number; wins: number; places: number };

/** Every season a jockey or trainer has results in (newest first) — for the "season by season" table on their page.
 *  Championships still count the current season only. Empty until supabase/season_stats_migration.sql has run. */
export async function getSeasonHistory(kind: "jockey" | "trainer", id: string): Promise<SeasonRow[]> {
  try {
    const supabase = createClient();
    const view = kind === "jockey" ? "jockey_season_stats" : "trainer_season_stats";
    const col = kind === "jockey" ? "jockey_id" : "trainer_id";
    const { data, error } = await supabase.from(view).select("*").eq(col, id).order("season", { ascending: false });
    if (error) return [];
    return (data ?? []).map((r: any) => ({ season: r.season, runs: r.rides ?? r.runners, wins: r.wins, places: r.places }));
  } catch {
    return [];
  }
}

/** 1-based position in this season's championship (null if no runs this season). Ties share the better place. */
export function seasonRank(m: Map<string, Line>, id: string): number | null {
  const me = m.get(id);
  if (!me || me.runs === 0) return null;
  let better = 0;
  for (const [k, l] of m) {
    if (k === id) continue;
    if (l.wins > me.wins || (l.wins === me.wins && (l.places > me.places || (l.places === me.places && l.runs < me.runs)))) better++;
  }
  return better + 1;
}
