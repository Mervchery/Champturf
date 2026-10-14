import { createPublicClient as createClient } from "@/lib/supabase/public";

/** MTCJC 2026 championships. Standings are computed from race_results + races, so they update by themselves
 *  as soon as results are published. Everything rule-related (qualifying races, points, prize money) is
 *  in this file — edit it here, nowhere else. */
export const CHAMP_YEAR = 2026;

/** Points for the special championships: 1st 7, 2nd 3, 3rd 2, 4th 1, 5th and below 0. */
export const POINTS: Record<number, number> = { 1: 7, 2: 3, 3: 2, 4: 1 };
export const pointsFor = (position: number) => POINTS[position] ?? 0;

export type QualRace = { name: string; date: string; aliases?: string[]; leg?: number; distance?: string; grade?: string };

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
    { name: "Derby", date: "2026-07-26", leg: 3, distance: "1,850 m", grade: "G1" },
  ],
  // Race names are not in the published rules ("to be confirmed against the MTCJC regulations").
  // Add `aliases` here once known; until then these two are shown as "name to be confirmed" and score nothing.
  threeyo: [
    { name: "First designated race", date: "2026-06-20" },
    { name: "Second designated race", date: "2026-07-18" },
  ],
};

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

export type RaceState = "done" | "upcoming" | "unmatched";
export type RaceStatus = QualRace & { state: RaceState; winner?: string | null };

export type SpecialBoard = { races: RaceStatus[]; rows: Row[] };

export type Championships = {
  available: boolean;
  year: number;
  horse: Row[];
  stable: Row[];
  jockey: Row[];
  mauritian: Row[];
  specials: Record<SpecialKey, SpecialBoard>;
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

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function nameMatches(dbName: string, q: QualRace) {
  const n = norm(dbName);
  return [q.name, ...(q.aliases ?? [])].map(norm).some((t) => t && (n.includes(t) || (n.length >= 5 && t.includes(n))));
}

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

export async function getChampionships(): Promise<Championships> {
  const year = CHAMP_YEAR;
  const emptySpecials = Object.fromEntries(
    (Object.keys(SPECIAL_RACES) as SpecialKey[]).map((k) => [
      k, { races: SPECIAL_RACES[k].map((r) => ({ ...r, state: "unmatched" as RaceState })), rows: [] },
    ]),
  ) as unknown as Record<SpecialKey, SpecialBoard>;
  const empty: Championships = {
    available: false, year, horse: [], stable: [], jockey: [], mauritian: [], specials: emptySpecials,
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

    // Which race row is which designated race (same day + name match)?
    const raceIndex = new Map<string, { key: SpecialKey; idx: number }>();
    const specials = {} as Record<SpecialKey, SpecialBoard>;
    for (const key of Object.keys(SPECIAL_RACES) as SpecialKey[]) {
      const statuses: RaceStatus[] = SPECIAL_RACES[key].map((q, idx) => {
        const hit = races.find((r) => r.race_date === q.date && nameMatches(r.name, q));
        if (hit) raceIndex.set(hit.id, { key, idx });
        return { ...q, state: !hit ? "unmatched" : hit.status === "completed" ? "done" : "upcoming" };
      });
      specials[key] = { races: statuses, rows: [] };
    }
    const redStarIds = new Set<string>();
    if (RED_STAR_RACES) for (const q of RED_STAR_RACES) for (const r of races) if (r.race_date === q.date && nameMatches(r.name, q)) redStarIds.add(r.id);

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
        if (pos === 1) specials[hit.key].races[hit.idx].winner = h.name;
      }
    }

    const rank = (m: Map<string, Acc>, cmp: (a: Acc, b: Acc) => number) => [...m.values()].sort(cmp).map(strip);
    for (const key of Object.keys(special) as SpecialKey[]) {
      specials[key].rows = [...special[key].values()].sort(byPoints).map(({ pos, ...row }) => row);
    }

    // Triple Crown: a horse must win every leg.
    const legs = specials.fouryo;
    const legsRun = legs.races.filter((r) => r.state === "done").length;
    const rows4 = legs.rows;
    const allWon = rows4.filter((r) => (r.cells ?? []).length === legs.races.length && (r.cells ?? []).every((c) => c === 1));
    const aliveRows = rows4.filter((r) => legsRun > 0 && (r.cells ?? []).every((c, i) => legs.races[i].state !== "done" || c === 1));
    const winner = allWon[0] ?? null;

    return {
      available: true, year,
      horse: rank(horse, byAmount),
      stable: rank(stable, byAmount),
      jockey: rank(jockey, byFinishes),
      mauritian: rank(maur, byPoints),
      specials,
      tripleCrown: {
        legsRun, alive: aliveRows, winner, bonus: TRIPLE_CROWN_BONUS[year],
        rolledOver: legsRun === legs.races.length && !winner,
      },
    };
  } catch {
    return empty;
  }
}
