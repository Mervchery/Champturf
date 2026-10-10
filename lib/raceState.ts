// Pure race-state helpers. Deliberately has NO imports, so it can be used from
// server components, client components and route handlers alike.
//
// The database only knows two race statuses — "upcoming" and "completed" — and the
// scraper flips a race to "completed" once the official result is in. Everything in
// between (about to go, running, waiting for the result) is derived here from the
// race's start time, in Mauritius time (UTC+4, no daylight saving).

export const MU_OFFSET = "+04:00";
export const MU_OFFSET_MS = 4 * 3600 * 1000;

/** Minutes before the off during which a race counts as "going to post". */
export const SOON_MIN = 15;
/** Minutes after the off during which a race is shown as LIVE. */
export const LIVE_WINDOW_MIN = 10;
/** Minutes after the off after which a race with no result is shown as "no result". */
export const RESULT_WAIT_MIN = 180;

export type RacePhase = "upcoming" | "soon" | "live" | "awaiting" | "finished" | "unresulted";

type Timed = { race_date: string; race_time: string };
type Stated = Timed & { status: string };

/** Start of a race as epoch ms. `race_time` is a Postgres `time` ("14:10:00"). */
export function raceStartMs(r: Timed): number {
  const raw = (r.race_time || "12:00:00").slice(0, 8);
  const time = raw.length === 5 ? `${raw}:00` : raw;
  return Date.parse(`${r.race_date}T${time}${MU_OFFSET}`);
}

/** Today's date in Mauritius, as YYYY-MM-DD. */
export function mauritiusDate(nowMs: number): string {
  return new Date(nowMs + MU_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, n: number): string {
  return new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
}

export function getRacePhase(r: Stated, nowMs: number): RacePhase {
  if (r.status === "completed") return "finished";
  const minsSinceOff = (nowMs - raceStartMs(r)) / 60000;
  if (minsSinceOff < -SOON_MIN) return "upcoming";
  if (minsSinceOff < 0) return "soon";
  if (minsSinceOff < LIVE_WINDOW_MIN) return "live";
  if (minsSinceOff < RESULT_WAIT_MIN) return "awaiting";
  return "unresulted";
}

/** Whole minutes until the off, rounded up (never negative). */
export function minutesToOff(r: Timed, nowMs: number): number {
  return Math.max(0, Math.ceil((raceStartMs(r) - nowMs) / 60000));
}

/** "14:10:00" → "14:10". */
export function fmtTime(t: string | null | undefined): string {
  return (t ?? "").slice(0, 5);
}

/** Tote prices are stored as strings ("3.5"); anything non-numeric or ≤ 0 is "no price". */
export function parseOdds(s: string | null | undefined): number | null {
  if (s == null) return null;
  const n = Number(s);
  // 9999 is Supertote's placeholder for "no price yet" — never a real price.
  return Number.isFinite(n) && n > 0 && n < 9999 ? n : null;
}

/** ▲ drifting / ▼ firming between two price strings. */
export function oddsDirection(now: string | null | undefined, before: string | null | undefined): "up" | "down" | null {
  const a = parseOdds(now);
  const b = parseOdds(before);
  if (a == null || b == null || a === b) return null;
  return a > b ? "up" : "down";
}

/** What a live scoreboard needs from a list of not-yet-finished races. */
export function pickBoardState<T extends Stated>(races: T[], nowMs: number): { live: T[]; next: T | null; awaiting: T[] } {
  const sorted = [...races].sort((a, b) => raceStartMs(a) - raceStartMs(b));
  const live: T[] = [];
  const awaiting: T[] = [];
  let next: T | null = null;
  for (const r of sorted) {
    const p = getRacePhase(r, nowMs);
    if (p === "live") live.push(r);
    else if (p === "awaiting") awaiting.push(r);
    else if ((p === "upcoming" || p === "soon") && !next) next = r;
  }
  return { live, next, awaiting };
}

/** How often (seconds) a page about these races should quietly refresh itself,
 *  or null when nothing on it can change any time soon. */
export function refreshIntervalSec(races: Stated[], nowMs: number): number | null {
  let best: number | null = null;
  const take = (n: number) => { best = best == null ? n : Math.min(best, n); };
  for (const r of races) {
    const p = getRacePhase(r, nowMs);
    if (p === "soon" || p === "live") take(15);
    else if (p === "awaiting") take(30);
    else if (p === "upcoming") {
      const hoursAway = (raceStartMs(r) - nowMs) / 3600000;
      if (hoursAway <= 8) take(45);
      else if (hoursAway <= 30) take(90);
    }
  }
  return best;
}

/** Tote prices are shown exactly as the feed gives them (e.g. "12", "3.5") — no scaling.
 *  Display only: tidies the number (drops trailing zeros) and leaves storage untouched. */
export function fmtOdds(s: string | number | null | undefined): string | null {
  if (s == null || s === "") return null;
  const n = Number(String(s).replace(",", "."));
  if (!Number.isFinite(n)) return String(s);
  return String(Math.round(n * 100) / 100);
}
