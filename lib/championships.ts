import { createPublicClient as createClient } from "@/lib/supabase/public";

/** MTCJC 2026 championships. Standings are computed from race_results + races, so they update by themselves
 *  as soon as results are published. Everything rule-related (qualifying races, points, prize money) is
 *  in this file — edit it here, nowhere else. */
export const CHAMP_YEAR = 2026;

/** Points for the special championships: 1st 7, 2nd 3, 3rd 2, 4th 1, 5th and below 0. */
export const POINTS: Record<number, number> = { 1: 7, 2: 3, 3: 2, 4: 1 };
export const pointsFor = (position: number) => POINTS[position] ?? 0;

export type QualRace = {
  name: string; date: string; aliases?: string[]; leg?: number; distance?: string; grade?: string;
  /** Words that must NOT appear in the database race name (e.g. "trial" so Derby never matches Derby Trial). */
  exclude?: string[];
  /** Max days a clearly named race may be moved from its listed date and still be linked (default 90). */
  drift?: number;
  /** Official name not known yet — never auto-matched, only date candidates are suggested. */
  unnamed?: boolean;
};

export type SpecialKey = "sprinters" | "milers" | "stayers" | "fouryo" | "threeyo";
export type ChampKey = "horse" | "stable" | "jockey" | "mauritian" | SpecialKey;

export const SPECIAL_RACES: Record<SpecialKey, QualRace[]> = {
  sprinters: [
    { name: "Azul Cup", date: "2026-08-16", aliases: ["azul"] },
    { name: "Hinterland Cup", date: "2026-09-12", aliases: ["hinterland"] },
    { name: "Princess Margaret Cup", date: "2026-10-10", aliases: ["princess margaret"] },
    { name: "Lightning Cup", date: "2026-11-14", aliases: ["lightning"] },
  ],
  milers: [
    { name: "Bicentenary Cup", date: "2026-05-30", aliases: ["bicentenary"] },
    { name: "Mauritius Telecom Barbé Cup", date: "2026-06-27", aliases: ["barbe cup", "barbe"] },
    { name: "Colonel Draper Cup", date: "2026-11-07", aliases: ["draper cup", "draper"] },
    { name: "Duke of York Cup", date: "2026-12-06", aliases: ["duke of york"] },
  ],
  stayers: [
    { name: "Supertote Golden Trophy", date: "2026-08-08", aliases: ["golden trophy"] },
    { name: "PhoenixBev Maiden Cup", date: "2026-09-06", aliases: ["phoenixbev", "phoenix bev"] },
    { name: "MTC 175th Anniversary Cup", date: "2026-10-17", aliases: ["175th", "175 anniversary"] },
    { name: "Presidents’ Cup", date: "2026-11-28", aliases: ["president s cup", "presidents cup"] },
  ],
  fouryo: [
    { name: "Derby Trial", date: "2026-05-16", leg: 1, distance: "1,400 m", grade: "G3" },
    { name: "Guineas", date: "2026-06-13", leg: 2, distance: "1,600 m", grade: "G2" },
    { name: "Derby", date: "2026-07-26", leg: 3, distance: "1,850 m", grade: "G1", exclude: ["trial"] },
  ],
  // Both races carry "MTC Sophomore" in their name, so the date tells them apart (drift 10 keeps the two from being swapped).
  threeyo: [
    { name: "MTC Sophomore 1", date: "2026-06-20", aliases: ["mtc sophomore", "sophomore"], drift: 10 },
    { name: "MTC Sophomore 2", date: "2026-07-18", aliases: ["mtc sophomore", "sophomore"], drift: 10 },
  ],
};

/** Manual fix when the tracker lists a run race as "not found": map "<championship>:<index>" to the race id from the
 *  tracker's "Data check" panel. Example: { "sprinters:2": "3f1c…" }. Index = position in SPECIAL_RACES (0 = first). */
export const RACE_OVERRIDES: Record<string, string> = {};

/** Use when a designated race has been moved to a new date that the results data does not show yet, e.g.
 *  { "sprinters:2": "2026-10-24" }. The tracker then counts down to the new date instead of calling the race "missing".
 *  Once the race is in the data under its new date it is linked automatically — this is only needed until then. */
export const DATE_CHANGES: Record<string, string> = {};

/** Triple Crown bonus by season (Rs), if no horse has won all three legs in the years before. */
export const TRIPLE_CROWN_BONUS: Record<number, number> = { 2026: 1_000_000, 2027: 2_000_000, 2028: 3_000_000 };

/** RED STAR Mauritian Jockeys Championship prizes (Rs). */
export const RED_STAR_PRIZES = [175_000, 50_000, 25_000];

/** The rules do not list the RED STAR designated races. null = every race of the season counts.
 *  To restrict it, list { name, date, aliases? } entries here like the other championships. */
export const RED_STAR_RACES: QualRace[] | null = null;

export type Row = {
  id: string;
  name: string;
  sub?: string | null;
  points: number;
  amount: number;
  wins: number;
  seconds: number;
  thirds: number;
  rides: number;
  cells?: (number | null)[]; // finishing position per qualifying race (null = did not run / not yet run)
};

/** counted = result is in and scored · pending = run, result not published yet · missing = run, but no matching race in the data
 *  · today = racing today · upcoming = still to come */
export type RaceState = "counted" | "pending" | "missing" | "today" | "upcoming";
export type Candidate = { id: string; name: string; date: string; status: string; results: number };
export type TrackedRace = QualRace & {
  champ: SpecialKey;
  idx: number;
  state: RaceState;
  /** `date` is the date the race really runs (or ran) on; `originalDate` is the date in the published rules. */
  originalDate: string;
  moved: boolean;
  /** whole days from today (Mauritius) to `date` — negative once run */
  daysTo: number;
  winner?: string | null;
  runners: number;
  /** the database race this designated race was linked to, and how sure we are */
  matched?: { id: string; name: string; date: string; confidence: "exact" | "fuzzy" | "manual"; note?: string };
  /** races found around the date — shown in the Data check panel when a run race could not be linked */
  candidates: Candidate[];
};
/** Kept for the page: a championship's races are tracked races. */
export type RaceStatus = TrackedRace;

export type Outlook = {
  toCome: number;        // designated races still to run (or running today)
  uncounted: number;     // already run but not scored yet (pending / missing)
  maxAvailable: number;  // most points anyone can still add (7 per remaining race)
  leaderGap: number | null;
  clinched: boolean;
  contenders: number;    // horses still able to catch the leader
};

export type SpecialBoard = { races: TrackedRace[]; rows: Row[]; outlook: Outlook };

export type TrackerSummary = { total: number; counted: number; pending: number; missing: number; upcoming: number; next: TrackedRace | null };

export type Championships = {
  available: boolean;
  year: number;
  today: string;
  horse: Row[];
  stable: Row[];
  jockey: Row[];
  mauritian: Row[];
  specials: Record<SpecialKey, SpecialBoard>;
  tracker: TrackedRace[];
  trackerSummary: TrackerSummary;
  tripleCrown: { legsRun: number; alive: Row[]; winner: Row | null; bonus: number; rolledOver: boolean };
};

type Acc = Row & { pos: number[] };
const MAX_POS = 24;
const newAcc = (id: string, name: string, sub?: string | null): Acc => ({
  id, name, sub, points: 0, amount: 0, wins: 0, seconds: 0, thirds: 0, rides: 0, pos: new Array(MAX_POS + 1).fill(0),
});
function add(a: Acc, position: number, amount: number, points = 0) {
  a.rides += 1;
  a.amount += amount;
  a.points += points;
  if (position === 1) a.wins += 1;
  if (position === 2) a.seconds += 1;
  if (position === 3) a.thirds += 1;
  if (position >= 1 && position <= MAX_POS) a.pos[position] += 1;
}
const strip = ({ pos, ...row }: Acc): Row => row;

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const STOP = new Set(["the", "cup", "trophy", "race", "stakes", "sponsored", "by", "of", "and", "plate", "handicap", "mauritius", "telecom", "mtc"]);
const tokens = (s: string) => norm(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w));

/** 0 = not this race · 0.6 = most key words match · 1 = the name (or a known alias) is inside the race name. */
function nameScore(dbName: string | null, q: QualRace): number {
  if (q.unnamed) return 0;
  const n = norm(dbName);
  if (!n) return 0;
  if ((q.exclude ?? []).some((x) => n.includes(norm(x)))) return 0;
  if ([q.name, ...(q.aliases ?? [])].map(norm).some((t) => t && (n.includes(t) || (n.length >= 5 && t.includes(n))))) return 1;
  const want = tokens(q.name);
  if (!want.length) return 0;
  const have = new Set(tokens(n));
  return want.filter((w) => have.has(w)).length / want.length >= 0.5 ? 0.6 : 0;
}

const dayNum = (d: string) => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000);
const daysBetween = (a: string, b: string) => dayNum(b) - dayNum(a);
/** Today's date in Mauritius (UTC+4) — the same clock the scraper uses. */
const mauritiusToday = () => new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10);

/** Prize money won by a finisher: the race's real prize split when scraped, else the site's 60/20/10 estimate. */
function prizeFor(race: any, position: number): number {
  const split = race?.prize_split as number[] | null;
  if (Array.isArray(split) && split.length) return Number(split[position - 1] ?? 0) || 0;
  const pct = position === 1 ? 0.6 : position === 2 ? 0.2 : position === 3 ? 0.1 : 0;
  return Number(race?.prize ?? 0) * pct;
}

async function fetchAll(build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

/** Jockeys: most wins, then most 2nds, 3rds, 4th… (every finishing position, in order). */
const byFinishes = (a: Acc, b: Acc) => {
  for (let i = 1; i <= MAX_POS; i++) if (a.pos[i] !== b.pos[i]) return b.pos[i] - a.pos[i];
  return a.name.localeCompare(b.name);
};
/** Points championships: points, then wins, seconds, thirds (provisional — official tie-breaks follow MTCJC regulations). */
const byPoints = (a: Acc, b: Acc) =>
  b.points - a.points || b.wins - a.wins || b.seconds - a.seconds || b.thirds - a.thirds || a.name.localeCompare(b.name);
const byAmount = (a: Acc, b: Acc) => b.amount - a.amount || b.wins - a.wins || a.name.localeCompare(b.name);

type DbRace = { id: string; name: string | null; race_date: string; status: string };
type Link = { race: DbRace; confidence: "exact" | "fuzzy" | "manual"; note?: string };

/** Links every designated race to the race row it really is. Exact date + name wins; otherwise the best fuzzy hit
 *  (name approximately right and date within 14 days, e.g. a postponed meeting); a manual override beats everything.
 *  A race row is never linked to two designated races. */
function linkRaces(races: DbRace[], results: Map<string, number>): Map<string, Link> {
  const links = new Map<string, Link>();
  const used = new Set<string>();
  const byId = new Map(races.map((r) => [r.id, r]));
  const keyOf = (k: SpecialKey, i: number) => `${k}:${i}`;

  for (const [key, id] of Object.entries(RACE_OVERRIDES)) {
    const r = byId.get(id);
    if (r) { links.set(key, { race: r, confidence: "manual" }); used.add(id); }
  }

  const pairs: { key: string; race: DbRace; score: number; link: Link }[] = [];
  for (const k of Object.keys(SPECIAL_RACES) as SpecialKey[]) {
    SPECIAL_RACES[k].forEach((q, i) => {
      if (links.has(keyOf(k, i))) return;
      for (const r of races) {
        const ns = nameScore(r.name, q);
        const ref = DATE_CHANGES[keyOf(k, i)] ?? q.date;
        const gap = Math.abs(daysBetween(ref, r.race_date));
        // A clearly named race is followed anywhere within 90 days of its listed date (postponements); an approximate name only within 14.
        if (!ns || gap > (ns === 1 ? q.drift ?? 90 : 14)) continue;
        const dateScore = gap === 0 ? 0.5 : Math.max(0, 0.4 - gap * 0.025);
        const exact = gap === 0 && ns === 1;
        const note = gap > 0 ? `run ${gap} day${gap > 1 ? "s" : ""} ${r.race_date > ref ? "after" : "before"} the ${ref === q.date ? "listed" : "updated"} date` : ns < 1 ? "name only approximately matches" : undefined;
        pairs.push({ key: keyOf(k, i), race: r, score: dateScore + ns * 0.5 + ((results.get(r.id) ?? 0) > 0 ? 0.05 : 0), link: { race: r, confidence: exact ? "exact" : "fuzzy", note } });
      }
    });
  }
  pairs.sort((a, b) => b.score - a.score);
  for (const p of pairs) {
    if (links.has(p.key) || used.has(p.race.id)) continue;
    links.set(p.key, p.link);
    used.add(p.race.id);
  }
  return links;
}

export async function getChampionships(): Promise<Championships> {
  const year = CHAMP_YEAR;
  const today = mauritiusToday();
  const blankOutlook: Outlook = { toCome: 0, uncounted: 0, maxAvailable: 0, leaderGap: null, clinched: false, contenders: 0 };
  const blankTracked = (k: SpecialKey): TrackedRace[] =>
    SPECIAL_RACES[k].map((q, idx) => ({
      ...q, originalDate: q.date, moved: false, champ: k, idx, daysTo: daysBetween(today, q.date), runners: 0, candidates: [],
      state: q.date > today ? "upcoming" : q.date === today ? "today" : "missing",
    }));
  const emptySpecials = Object.fromEntries(
    (Object.keys(SPECIAL_RACES) as SpecialKey[]).map((k) => [k, { races: blankTracked(k), rows: [], outlook: blankOutlook }]),
  ) as unknown as Record<SpecialKey, SpecialBoard>;
  const summarise = (all: TrackedRace[]): TrackerSummary => ({
    total: all.length,
    counted: all.filter((r) => r.state === "counted").length,
    pending: all.filter((r) => r.state === "pending").length,
    missing: all.filter((r) => r.state === "missing").length,
    upcoming: all.filter((r) => r.state === "upcoming" || r.state === "today").length,
    next: all.find((r) => r.state === "today" || r.state === "upcoming") ?? null,
  });
  const sortRaces = (all: TrackedRace[]) => [...all].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const emptyAll = sortRaces((Object.keys(emptySpecials) as SpecialKey[]).flatMap((k) => emptySpecials[k].races));
  const empty: Championships = {
    available: false, year, today, horse: [], stable: [], jockey: [], mauritian: [], specials: emptySpecials,
    tracker: emptyAll, trackerSummary: summarise(emptyAll),
    tripleCrown: { legsRun: 0, alive: [], winner: null, bonus: TRIPLE_CROWN_BONUS[year], rolledOver: false },
  };

  try {
    const supabase = createClient();
    const start = `${year}-01-01`, end = `${year}-12-31`;
    const [races, results] = await Promise.all([
      fetchAll((a, b) => supabase.from("races").select("id, name, race_date, status").gte("race_date", start).lte("race_date", end).order("race_date").order("id").range(a, b)),
      fetchAll((a, b) =>
        supabase.from("race_results")
          .select("id, position, horse_id, jockey_id, races!inner(id, name, race_date, prize, prize_split), horses(id, name, age, stable:stables(id, name)), jockeys(id, name, nationality, apprentice)")
          .gte("races.race_date", start).lte("races.race_date", end).order("id").range(a, b)),
    ]);

    // How many result rows (and which winner) each race has — a race with results is "counted" whatever its status flag says.
    const resultCount = new Map<string, number>(), winnerOf = new Map<string, string>();
    for (const r of results) {
      const rid = r.races?.id as string | undefined;
      if (!rid || !Number(r.position)) continue;
      resultCount.set(rid, (resultCount.get(rid) ?? 0) + 1);
      if (Number(r.position) === 1 && r.horses?.name) winnerOf.set(rid, r.horses.name);
    }

    const links = linkRaces(races as DbRace[], resultCount);
    const raceIndex = new Map<string, { key: SpecialKey; idx: number }>();
    const specials = {} as Record<SpecialKey, SpecialBoard>;
    const tracker: TrackedRace[] = [];
    for (const key of Object.keys(SPECIAL_RACES) as SpecialKey[]) {
      const tracked: TrackedRace[] = SPECIAL_RACES[key].map((q, idx) => {
        const link = links.get(`${key}:${idx}`);
        const runners = link ? resultCount.get(link.race.id) ?? 0 : 0;
        const planned = DATE_CHANGES[`${key}:${idx}`] ?? q.date;
        const actual = link ? link.race.race_date : planned;
        let state: RaceState;
        if (link && runners > 0) state = "counted";
        else if (actual > today) state = "upcoming";
        else if (actual === today) state = "today";
        else state = link ? "pending" : "missing";
        if (link) raceIndex.set(link.race.id, { key, idx });
        const near = state === "pending" || state === "missing"
          ? (races as DbRace[]).filter((r) => Math.abs(daysBetween(planned, r.race_date)) <= 1 || nameScore(r.name, q) > 0).slice(0, 14)
              .map((r) => ({ id: r.id, name: r.name ?? "(no name)", date: r.race_date, status: r.status, results: resultCount.get(r.id) ?? 0 }))
          : [];
        return {
          ...q, date: actual, originalDate: q.date, moved: actual !== q.date,
          champ: key, idx, state, daysTo: daysBetween(today, actual), runners, candidates: near,
          winner: link ? winnerOf.get(link.race.id) ?? null : null,
          matched: link ? { id: link.race.id, name: link.race.name ?? "(no name)", date: link.race.race_date, confidence: link.confidence, note: link.note } : undefined,
        };
      });
      specials[key] = { races: tracked, rows: [], outlook: blankOutlook };
      tracker.push(...tracked);
    }

    const redStarIds = new Set<string>();
    if (RED_STAR_RACES) for (const q of RED_STAR_RACES) for (const r of races as DbRace[]) if (r.race_date === q.date && nameScore(r.name, q) === 1) redStarIds.add(r.id);

    const horse = new Map<string, Acc>(), stable = new Map<string, Acc>(), jockey = new Map<string, Acc>(), maur = new Map<string, Acc>();
    const special: Record<SpecialKey, Map<string, Acc & { cells: (number | null)[] }>> = { sprinters: new Map(), milers: new Map(), stayers: new Map(), fouryo: new Map(), threeyo: new Map() };
    const get = <T extends Acc>(m: Map<string, T>, id: string, make: () => T) => m.get(id) ?? (m.set(id, make()), m.get(id)!);

    for (const r of results) {
      const pos = Number(r.position);
      if (!pos || pos < 1) continue;
      const amount = prizeFor(r.races, pos);
      const h = r.horses, j = r.jockeys;
      if (h) {
        add(get(horse, h.id, () => newAcc(h.id, h.name, h.stable?.name ?? null)), pos, amount);
        if (h.stable) add(get(stable, h.stable.id, () => newAcc(h.stable.id, h.stable.name)), pos, amount);
      }
      if (j) {
        add(get(jockey, j.id, () => newAcc(j.id, j.name, j.apprentice ? "Apprentice" : null)), pos, amount);
        const inRedStar = RED_STAR_RACES ? redStarIds.has(r.races.id) : true;
        if (inRedStar && /maurit/i.test(j.nationality ?? "")) add(get(maur, j.id, () => newAcc(j.id, j.name, j.apprentice ? "Apprentice" : null)), pos, 0, pointsFor(pos));
      }
      const hit = raceIndex.get(r.races.id);
      if (hit && h) {
        const n = SPECIAL_RACES[hit.key].length;
        const acc = get(special[hit.key], h.id, () => ({ ...newAcc(h.id, h.name, h.stable?.name ?? null), cells: new Array(n).fill(null) }));
        add(acc, pos, 0, pointsFor(pos));
        acc.cells[hit.idx] = pos;
      }
    }

    const rank = (m: Map<string, Acc>, cmp: (a: Acc, b: Acc) => number) => [...m.values()].sort(cmp).map(strip);
    for (const key of Object.keys(special) as SpecialKey[]) {
      const rows = [...special[key].values()].sort(byPoints).map(({ pos, ...row }) => row);
      const rs = specials[key].races;
      const toCome = rs.filter((r) => r.state === "upcoming" || r.state === "today").length;
      const uncounted = rs.filter((r) => r.state === "pending" || r.state === "missing").length;
      const maxAvailable = (toCome + uncounted) * POINTS[1];
      const lead = rows[0], second = rows[1];
      const gap = lead ? lead.points - (second?.points ?? 0) : null;
      specials[key].rows = rows;
      specials[key].outlook = {
        toCome, uncounted, maxAvailable, leaderGap: gap,
        clinched: !!lead && lead.points > 0 && (maxAvailable === 0 || (gap ?? 0) > maxAvailable),
        contenders: lead ? rows.filter((r) => r.points + maxAvailable >= lead.points).length : 0,
      };
    }

    // Triple Crown: a horse must win every leg.
    const legs = specials.fouryo;
    const legsRun = legs.races.filter((r) => r.state === "counted").length;
    const rows4 = legs.rows;
    const allWon = rows4.filter((r) => (r.cells ?? []).length === legs.races.length && (r.cells ?? []).every((c) => c === 1));
    const aliveRows = rows4.filter((r) => legsRun > 0 && (r.cells ?? []).every((c, i) => legs.races[i].state !== "counted" || c === 1));
    const winner = allWon[0] ?? null;
    const all = sortRaces(tracker);

    return {
      available: true, year, today,
      horse: rank(horse, byAmount),
      stable: rank(stable, byAmount),
      jockey: rank(jockey, byFinishes),
      mauritian: rank(maur, byPoints),
      specials, tracker: all, trackerSummary: summarise(all),
      tripleCrown: {
        legsRun, alive: aliveRows, winner, bonus: TRIPLE_CROWN_BONUS[year],
        rolledOver: legsRun === legs.races.length && !winner,
      },
    };
  } catch {
    return empty;
  }
}
