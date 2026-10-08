// v9 data helpers for the race-day dashboard, home page, live page and results centre.
// Everything here goes through the shared public Supabase client (30 s data cache) and
// only READS the tables the scraper already fills — no schema changes.
import { createPublicClient as createClient } from "@/lib/supabase/public";
import type { Race } from "@/lib/races";
import type { SpotRace } from "@/components/RaceSpotlight";
import { addDaysIso, getRacePhase, mauritiusDate, parseOdds } from "@/lib/raceState";

export type PodiumRow = {
  position: number;
  runnerNo: number | null;
  horseId: string | null;
  horseName: string;
  silkUrl: string | null;
  jockeyId: string | null;
  jockeyName: string | null;
  trainerId: string | null;
  trainerName: string | null;
  /** Starting price when we have it, otherwise the final win price. */
  odds: string | null;
  time: string | null;
  margin: string | null;
};

export type MarketRunner = {
  id: string | null;
  no: number | null;
  name: string;
  odds: string | null;
  oddsPrev: string | null;
  oddsOpen: string | null;
  tipped: boolean;
};

export type BoardRace = {
  race: Race;
  /** 1-based position on the day's card (by race time). */
  no: number;
  total: number;
  runnerCount: number;
  /** Market leaders (shortest prices first), at most 3. Empty when no prices yet. */
  market: MarketRunner[];
  /** Top three finishers once the race is completed. */
  podium: PodiumRow[];
};

export type ResultRace = {
  id: string;
  name: string;
  race_date: string;
  race_time: string;
  distance: string;
  course: string;
  race_class: string | null;
  prize: number;
  youtube_video_id: string | null;
  no: number;
  runnerCount: number;
  podium: PodiumRow[];
  /** Lower-cased names of every finisher, jockey and trainer — for the results search box. */
  search: string;
};

const ENTRY_BOARD_SELECT = "race_id, runner_no, odds, odds_prev, odds_open, is_tipped, horses(id, name)";
const RESULT_BOARD_SELECT =
  "race_id, position, runner_no, jockey, finish_time, margin, starting_price, win_odds, " +
  "horses(id, name, silk_image_url, trainer:trainers(id, name)), jockeys(id, name), trainers(id, name)";

/** Maps a race_results row (full or board-sized) to what the podium UI needs. */
export function toPodiumRow(r: any): PodiumRow {
  return {
    position: r.position,
    runnerNo: r.runner_no ?? null,
    horseId: r.horses?.id ?? null,
    horseName: r.horses?.name ?? "—",
    silkUrl: r.horses?.silk_image_url ?? null,
    jockeyId: r.jockeys?.id ?? null,
    jockeyName: r.jockeys?.name || r.jockey || null,
    trainerId: r.trainers?.id ?? r.horses?.trainer?.id ?? null,
    trainerName: r.trainers?.name ?? r.horses?.trainer?.name ?? null,
    odds: r.starting_price ?? r.win_odds ?? null,
    time: r.finish_time ?? null,
    margin: r.margin ?? null,
  };
}

function byPrice(a: MarketRunner, b: MarketRunner) {
  const pa = parseOdds(a.odds);
  const pb = parseOdds(b.odds);
  if (pa == null && pb == null) return (a.no ?? 99) - (b.no ?? 99);
  if (pa == null) return 1;
  if (pb == null) return -1;
  return pa - pb || (a.no ?? 99) - (b.no ?? 99);
}

/** Every race on one date, each with its market leaders (upcoming) or podium (completed).
 *  Three queries in total, however many races the card has. */
export async function getMeetingBoard(date: string): Promise<BoardRace[]> {
  const supabase = createClient();
  const { data: races, error } = await supabase
    .from("races")
    .select("*")
    .eq("race_date", date)
    .order("race_time", { ascending: true });
  if (error) throw error;
  const list = (races ?? []) as Race[];
  if (list.length === 0) return [];

  const ids = list.map((r) => r.id);
  // The cards are an enhancement: if either lookup fails the race list itself still renders.
  const [entriesRes, resultsRes] = await Promise.all([
    supabase.from("race_entries").select(ENTRY_BOARD_SELECT).in("race_id", ids),
    supabase.from("race_results").select(RESULT_BOARD_SELECT).in("race_id", ids).order("position", { ascending: true }),
  ]);
  const entries: any[] = entriesRes.error ? [] : ((entriesRes.data as any) ?? []);
  const results: any[] = resultsRes.error ? [] : ((resultsRes.data as any) ?? []);

  return list.map((race, i) => {
    const raceEntries = entries.filter((e) => e.race_id === race.id);
    const raceResults = results.filter((r) => r.race_id === race.id);
    const market: MarketRunner[] = raceEntries
      .map((e) => ({
        id: e.horses?.id ?? null,
        no: e.runner_no ?? null,
        name: e.horses?.name ?? "—",
        odds: e.odds ?? null,
        oddsPrev: e.odds_prev ?? null,
        oddsOpen: e.odds_open ?? null,
        tipped: !!e.is_tipped,
      }))
      .filter((m) => parseOdds(m.odds) != null)
      .sort(byPrice)
      .slice(0, 3);
    return {
      race,
      no: i + 1,
      total: list.length,
      runnerCount: Math.max(raceEntries.length, raceResults.length),
      market,
      podium: raceResults.slice(0, 3).map(toPodiumRow),
    };
  });
}

/** The race date the site should be "about" right now: the first meeting that still has a
 *  race to run (or one that ran in the last few hours and has no result yet). Races stuck
 *  as "upcoming" days ago — the scraper never got a result — are ignored. */
export async function getCurrentMeetingDate(nowMs: number): Promise<string | null> {
  const supabase = createClient();
  const from = addDaysIso(mauritiusDate(nowMs), -1);
  const { data, error } = await supabase
    .from("races")
    .select("race_date, race_time, status")
    .eq("status", "upcoming")
    .gte("race_date", from)
    .order("race_date", { ascending: true })
    .order("race_time", { ascending: true })
    .limit(80);
  if (error) throw error;
  const hit = (data ?? []).find((r) => getRacePhase(r as any, nowMs) !== "unresulted");
  return hit ? hit.race_date : null;
}

/** Distinct dates that have at least one completed race, newest first. */
export async function getResultDates(limit = 60): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("races")
    .select("race_date")
    .eq("status", "completed")
    .order("race_date", { ascending: false })
    .limit(600);
  if (error) throw error;
  const seen = new Set<string>();
  for (const r of data ?? []) {
    seen.add(r.race_date);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

/** Completed races on the given dates (newest race first), each with its podium and a
 *  search blob. Race numbers count every race on the card, finished or not. */
export async function getResultsForDates(dates: string[]): Promise<ResultRace[]> {
  if (dates.length === 0) return [];
  const supabase = createClient();
  const { data: races, error } = await supabase
    .from("races")
    .select("*")
    .in("race_date", dates)
    .order("race_date", { ascending: false })
    .order("race_time", { ascending: true });
  if (error) throw error;
  const all = (races ?? []) as Race[];
  const completed = all.filter((r) => r.status === "completed");
  if (completed.length === 0) return [];

  const { data: results, error: resErr } = await supabase
    .from("race_results")
    .select(RESULT_BOARD_SELECT)
    .in("race_id", completed.map((r) => r.id))
    .order("position", { ascending: true });
  if (resErr) throw resErr;
  const rows: any[] = (results as any) ?? [];

  const numberOf = new Map<string, number>();
  const perDate = new Map<string, number>();
  for (const r of all) {
    const n = (perDate.get(r.race_date) ?? 0) + 1;
    perDate.set(r.race_date, n);
    numberOf.set(r.id, n);
  }

  return completed
    .map((race): ResultRace => {
      const mine = rows.filter((r) => r.race_id === race.id);
      const podium = mine.slice(0, 3).map(toPodiumRow);
      const search = [race.name, ...mine.map((r) => toPodiumRow(r)).flatMap((p) => [p.horseName, p.jockeyName ?? "", p.trainerName ?? ""])]
        .join(" ")
        .toLowerCase();
      return {
        id: race.id,
        name: race.name,
        race_date: race.race_date,
        race_time: race.race_time,
        distance: race.distance,
        course: race.course,
        race_class: race.race_class,
        prize: race.prize,
        youtube_video_id: race.youtube_video_id,
        no: numberOf.get(race.id) ?? 0,
        runnerCount: mine.length,
        podium,
        search,
      };
    })
    .sort((a, b) => b.race_date.localeCompare(a.race_date) || b.race_time.localeCompare(a.race_time));
}

/** The most recent finished races across the latest meetings — home page & live page. */
export async function getLatestResults(maxRaces = 6): Promise<ResultRace[]> {
  const dates = await getResultDates(2);
  const races = await getResultsForDates(dates);
  return races.slice(0, maxRaces);
}

/** A board race in the shape the live "next race / live now" card needs. */
export function toSpotRace(b: BoardRace): SpotRace {
  return {
    id: b.race.id,
    name: b.race.name,
    race_date: b.race.race_date,
    race_time: b.race.race_time,
    status: b.race.status,
    distance: b.race.distance,
    prize: b.race.prize,
    course: b.race.course,
    no: b.no,
    total: b.total,
    runnerCount: b.runnerCount,
    runners: b.market.map((m) => ({ no: m.no, name: m.name, odds: m.odds, oddsPrev: m.oddsPrev })),
  };
}
