import { createPublicClient as createClient } from "@/lib/supabase/public";
import type { StableSummary } from "@/lib/trainers";
import { getRacePhase } from "@/lib/raceState";

export type RefSummary = { id: string; name: string };

export type Horse = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  breed: string | null;
  color: string | null;
  origin: string | null;
  medical_status: string | null;
  rating: number | null;
  photo_url: string | null;
  // The actual silk artwork for this horse, scraped from supertote.mu
  // (see scraper/lib/parseRacePage.mjs) — this is the real image, not a
  // generated approximation, so it already reflects the owner's actual
  // colors/cap regardless of which stable trains the horse. Null until
  // the scraper has seen this horse run at least once.
  silk_image_url: string | null;
  // FK ids — used by the admin edit form's dropdowns.
  owner_id: string | null;
  trainer_id: string | null;
  stable_id: string | null;
  // Joined display data — always read these for showing a horse's
  // connections, never the *_id fields directly, so renaming an owner/
  // trainer/stable anywhere updates every horse automatically.
  owner: RefSummary | null;
  trainer: RefSummary | null;
  stable: StableSummary | null;
  // wins/seconds/thirds/unplaced/starts/earnings are NOT hand-edited —
  // they're maintained automatically by a database trigger whenever
  // race_results changes (see supabase/race_entries_results_migration.sql).
  wins: number;
  seconds: number;
  thirds: number;
  unplaced: number;
  starts: number;
  earnings: number;
};

const HORSE_SELECT = "*, owner:owners(id, name), trainer:trainers(id, name), stable:stables(id, name, silk_primary, silk_secondary, silk_cap, silk_pattern)";

export async function getHorses(): Promise<Horse[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("horses").select(HORSE_SELECT).order("wins", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function getHorseById(id: string): Promise<Horse | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("horses").select(HORSE_SELECT).eq("id", id).single();
  if (error) return null;
  return data as any;
}

export type FormEntry = { position: number; raceId: string; raceName: string; raceDate: string };

/** Last 5 finishes for this horse, joined via the real horse_id foreign
 *  key on race_results. */
export async function getRecentForm(horseId: string): Promise<string[]> {
  const entries = await getRecentFormDetailed(horseId);
  return entries.map((e) => String(e.position));
}

/** Same as getRecentForm but with the race context attached, for pages
 *  that want to link each form result to the race it happened in. */
export async function getRecentFormDetailed(horseId: string): Promise<FormEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_results")
    .select("position, race_id, races(name, race_date)")
    .eq("horse_id", horseId);
  if (error || !data) return [];
  const mapped = (data as any[]).map((row) => ({
    position: row.position,
    raceId: row.race_id,
    raceName: row.races?.name ?? "Unknown race",
    raceDate: row.races?.race_date ?? "",
  }));
  mapped.sort((a, b) => b.raceDate.localeCompare(a.raceDate));
  return mapped.slice(0, 5);
}

// ---------------------------------------------------------------------------
// v9: richer horse profile — previous runs, next engagement and splits.
// Pure reads of race_results / race_entries; nothing new is stored.
// ---------------------------------------------------------------------------

export type HorseRun = {
  raceId: string;
  raceName: string;
  raceDate: string;
  distance: string | null;
  course: string | null;
  position: number;
  /** Number of recorded finishers in that race (null when unknown). */
  fieldSize: number | null;
  jockeyId: string | null;
  jockeyName: string | null;
  trainerName: string | null;
  /** Starting price when known, else the final win price. */
  odds: string | null;
  time: string | null;
  margin: string | null;
  weight: number | null;
};

export type HorseNextRun = {
  raceId: string;
  raceName: string;
  raceDate: string;
  raceTime: string;
  distance: string | null;
  runnerNo: number | null;
  gate: number | null;
  weight: number | null;
  jockeyId: string | null;
  jockeyName: string | null;
  odds: string | null;
  oddsPrev: string | null;
};

export type SplitStat = { key: string; label: string; id: string | null; starts: number; wins: number; places: number };

export type HorseProfileExtras = {
  /** Most recent first, at most 20. */
  runs: HorseRun[];
  next: HorseNextRun | null;
  /** Stats over every recorded run (not just the 20 shown). */
  recorded: { starts: number; wins: number; places: number; winPct: number; placePct: number; avgFinish: number | null };
  lastRunDate: string | null;
  byDistance: SplitStat[];
  byJockey: SplitStat[];
};

function tally(rows: HorseRun[], keyOf: (r: HorseRun) => { key: string; label: string; id: string | null } | null, max: number): SplitStat[] {
  const map = new Map<string, SplitStat>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    const s = map.get(k.key) ?? { key: k.key, label: k.label, id: k.id, starts: 0, wins: 0, places: 0 };
    s.starts += 1;
    if (r.position === 1) s.wins += 1;
    if (r.position >= 1 && r.position <= 3) s.places += 1;
    map.set(k.key, s);
  }
  return [...map.values()].sort((a, b) => b.starts - a.starts || b.wins - a.wins).slice(0, max);
}

export async function getHorseProfileExtras(horseId: string, nowMs: number): Promise<HorseProfileExtras> {
  const supabase = createClient();
  const [runsRes, nextRes] = await Promise.all([
    supabase
      .from("race_results")
      .select("position, race_id, jockey, finish_time, margin, weight_kg, starting_price, win_odds, races(id, name, race_date, distance, course), jockeys(id, name), trainers(id, name)")
      .eq("horse_id", horseId),
    supabase
      .from("race_entries")
      .select("runner_no, gate, weight_kg, odds, odds_prev, jockeys(id, name), races!inner(id, name, race_date, race_time, distance, status)")
      .eq("horse_id", horseId)
      .eq("races.status", "upcoming"),
  ]);

  const rawRuns: any[] = runsRes.error ? [] : ((runsRes.data as any) ?? []);
  const all: HorseRun[] = rawRuns
    .map((r) => ({
      raceId: r.race_id as string,
      raceName: (r.races?.name as string) ?? "Unknown race",
      raceDate: (r.races?.race_date as string) ?? "",
      distance: (r.races?.distance as string) ?? null,
      course: (r.races?.course as string) ?? null,
      position: r.position as number,
      fieldSize: null as number | null,
      jockeyId: r.jockeys?.id ?? null,
      jockeyName: r.jockeys?.name || r.jockey || null,
      trainerName: r.trainers?.name ?? null,
      odds: r.starting_price ?? r.win_odds ?? null,
      time: r.finish_time ?? null,
      margin: r.margin ?? null,
      weight: r.weight_kg ?? null,
    }))
    .sort((a, b) => b.raceDate.localeCompare(a.raceDate));

  const shown = all.slice(0, 20);
  if (shown.length > 0) {
    const { data: fieldRows } = await supabase.from("race_results").select("race_id").in("race_id", shown.map((r) => r.raceId));
    const counts = new Map<string, number>();
    for (const row of (fieldRows as any[]) ?? []) counts.set(row.race_id, (counts.get(row.race_id) ?? 0) + 1);
    for (const r of shown) r.fieldSize = counts.get(r.raceId) ?? null;
  }

  const starts = all.length;
  const wins = all.filter((r) => r.position === 1).length;
  const places = all.filter((r) => r.position >= 1 && r.position <= 3).length;
  const recorded = {
    starts,
    wins,
    places,
    winPct: starts > 0 ? Math.round((wins / starts) * 1000) / 10 : 0,
    placePct: starts > 0 ? Math.round((places / starts) * 1000) / 10 : 0,
    avgFinish: starts > 0 ? Math.round((all.reduce((s, r) => s + r.position, 0) / starts) * 10) / 10 : null,
  };

  const nextRows: any[] = nextRes.error ? [] : ((nextRes.data as any) ?? []);
  const next = nextRows
    .filter((e) => e.races && getRacePhase(e.races, nowMs) !== "unresulted" && getRacePhase(e.races, nowMs) !== "finished")
    .sort((a, b) => `${a.races.race_date}T${a.races.race_time}`.localeCompare(`${b.races.race_date}T${b.races.race_time}`))[0];

  return {
    runs: shown,
    next: next
      ? {
          raceId: next.races.id,
          raceName: next.races.name,
          raceDate: next.races.race_date,
          raceTime: next.races.race_time,
          distance: next.races.distance ?? null,
          runnerNo: next.runner_no ?? null,
          gate: next.gate ?? null,
          weight: next.weight_kg ?? null,
          jockeyId: next.jockeys?.id ?? null,
          jockeyName: next.jockeys?.name ?? null,
          odds: next.odds ?? null,
          oddsPrev: next.odds_prev ?? null,
        }
      : null,
    recorded,
    lastRunDate: all[0]?.raceDate || null,
    byDistance: tally(all, (r) => (r.distance ? { key: r.distance, label: r.distance, id: null } : null), 4),
    byJockey: tally(all, (r) => (r.jockeyName ? { key: r.jockeyId ?? r.jockeyName, label: r.jockeyName, id: r.jockeyId } : null), 3),
  };
}

/** Last 5 finishing positions (newest first) for many horses in ONE query — used by the
 *  race card so an N-runner field costs one lookup instead of N. */
export async function getRecentFormForHorses(horseIds: string[]): Promise<Record<string, string[]>> {
  if (horseIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase
    .from("race_results")
    .select("horse_id, position, races(race_date)")
    .in("horse_id", horseIds);
  if (error || !data) return {};
  const byHorse = new Map<string, { position: number; date: string }[]>();
  for (const row of data as any[]) {
    const list = byHorse.get(row.horse_id) ?? [];
    list.push({ position: row.position, date: row.races?.race_date ?? "" });
    byHorse.set(row.horse_id, list);
  }
  const out: Record<string, string[]> = {};
  for (const [id, list] of byHorse) {
    out[id] = list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((r) => String(r.position));
  }
  return out;
}
