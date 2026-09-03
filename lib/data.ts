// All entities below are fictional, for demonstration purposes only.
// In production, replace this module with real database queries
// (e.g. Prisma + PostgreSQL) behind the same function signatures.

export type Stable = {
  id: string;
  name: string;
  owner: string;
  location: string;
  horses: number;
  staff: number;
  gallery: number;
  trainers: string[];
};

export type Owner = {
  id: string;
  name: string;
  horses: number;
  wins: number;
  achievements: string;
};

export type Trainer = {
  id: string;
  name: string;
  stable: string;
  wins: number;
  horses: number;
  ranking: number;
  achievements: string;
};

export type Jockey = {
  id: string;
  name: string;
  nat: string;
  wins: number;
  places: number;
  winPct: number;
  rides: number;
  apprentice: boolean;
  bio?: string;
  suspensions?: number;
  achievements?: string;
  mentor?: string;
  allowance?: string;
  progress?: string;
};

export type Horse = {
  id: string;
  name: string;
  age: number;
  sex: string;
  breed: string;
  color: string;
  origin: string;
  owner: string;
  trainer: string;
  stable: string;
  wins: number;
  places: number;
  starts: number;
  earnings: number;
  form: string[];
};

export type RaceResultRow = { pos: number; horse: string; jockey: string; time: string };

export type Race = {
  id: string;
  name: string;
  course: string;
  date: string;
  time: string;
  distance: string;
  prize: number;
  status: "upcoming" | "completed";
  conditions: string;
  entries: string[];
  result?: RaceResultRow[];
};

export type NewsArticle = {
  id: string;
  cat: string;
  title: string;
  date: string;
  excerpt: string;
};

export const STABLES: Stable[] = [
  { id: "st1", name: "Vallée Verte Stables", owner: "R. Appadoo", location: "Vacoas", horses: 14, staff: 9, gallery: 3, trainers: ["Jean-Marc Ferrière"] },
  { id: "st2", name: "Baie du Cap Racing", owner: "S. Naidoo Bloodstock", location: "Black River", horses: 9, staff: 6, gallery: 2, trainers: ["Kevin Li-A-Young"] },
  { id: "st3", name: "Domaine Coralie", owner: "Coralie Estates Ltd", location: "Moka", horses: 11, staff: 7, gallery: 4, trainers: ["Alicia Ramtohul"] },
  { id: "st4", name: "Pointe d'Or Stables", owner: "Pointe d'Or Syndicate", location: "Grand Baie", horses: 7, staff: 5, gallery: 1, trainers: ["Kevin Li-A-Young"] },
];

export const OWNERS: Owner[] = [
  { id: "o1", name: "R. Appadoo", horses: 5, wins: 22, achievements: "Leading Owner 2024" },
  { id: "o2", name: "S. Naidoo Bloodstock", horses: 4, wins: 15, achievements: "Champion Owner runner-up 2023" },
  { id: "o3", name: "Coralie Estates Ltd", horses: 6, wins: 19, achievements: "Best newcomer stable 2022" },
  { id: "o4", name: "Pointe d'Or Syndicate", horses: 3, wins: 8, achievements: "—" },
];

export const TRAINERS: Trainer[] = [
  { id: "t1", name: "Jean-Marc Ferrière", stable: "Vallée Verte Stables", wins: 64, horses: 14, ranking: 1, achievements: "Leading Trainer 2023 & 2024" },
  { id: "t2", name: "Kevin Li-A-Young", stable: "Baie du Cap Racing / Pointe d'Or Stables", wins: 41, horses: 16, ranking: 2, achievements: "Trainer of the Meeting × 6" },
  { id: "t3", name: "Alicia Ramtohul", stable: "Domaine Coralie", wins: 37, horses: 11, ranking: 3, achievements: "Rising Trainer Award 2022" },
];

export const JOCKEYS: Jockey[] = [
  { id: "j1", name: "D. Bissessur", nat: "Mauritius", wins: 118, places: 96, winPct: 24.1, rides: 490, apprentice: false, bio: "A leading rider at Champ de Mars known for strong front-running tactics.", suspensions: 0, achievements: "Champion Jockey 2023, 2024" },
  { id: "j2", name: "T. Govinden", nat: "Mauritius", wins: 97, places: 88, winPct: 21.3, rides: 455, apprentice: false, bio: "Consistent top-three finisher with a strong record over sprint distances.", suspensions: 1, achievements: "Runner-up Champion Jockey 2024" },
  { id: "j3", name: "M. Sanmoogam", nat: "Mauritius", wins: 73, places: 70, winPct: 18.4, rides: 397, apprentice: false, bio: "Specialist in staying races, favoured by several leading stables.", suspensions: 0, achievements: "Top Stayer's Jockey 2023" },
  { id: "j4", name: "A. Pillay", nat: "South Africa", wins: 58, places: 61, winPct: 16.9, rides: 343, apprentice: false, bio: "Visiting rider with strong seasonal form on the Mauritian circuit.", suspensions: 0, achievements: "—" },
  { id: "a1", name: "N. Rughoobur", nat: "Mauritius", wins: 12, places: 19, winPct: 9.8, rides: 122, apprentice: true, mentor: "D. Bissessur", allowance: "3kg", progress: "Second season — steady improvement in big-field handling." },
  { id: "a2", name: "K. Beeharry", nat: "Mauritius", wins: 8, places: 14, winPct: 7.6, rides: 105, apprentice: true, mentor: "T. Govinden", allowance: "4kg", progress: "First full season — shortlisted for Apprentice of the Year." },
];

export const HORSES: Horse[] = [
  { id: "h1", name: "Île Royale", age: 5, sex: "Gelding", breed: "Thoroughbred", color: "Bay", origin: "South Africa", owner: "R. Appadoo", trainer: "Jean-Marc Ferrière", stable: "Vallée Verte Stables", wins: 11, places: 7, starts: 24, earnings: 2140000, form: ["1", "1", "3", "2", "1"] },
  { id: "h2", name: "Corsaire du Nord", age: 4, sex: "Colt", breed: "Thoroughbred", color: "Chestnut", origin: "Mauritius", owner: "Coralie Estates Ltd", trainer: "Alicia Ramtohul", stable: "Domaine Coralie", wins: 9, places: 8, starts: 20, earnings: 1785000, form: ["2", "1", "1", "4", "2"] },
  { id: "h3", name: "Belle Étoile", age: 6, sex: "Mare", breed: "Thoroughbred", color: "Grey", origin: "France", owner: "S. Naidoo Bloodstock", trainer: "Kevin Li-A-Young", stable: "Baie du Cap Racing", wins: 14, places: 9, starts: 31, earnings: 2960000, form: ["1", "2", "1", "1", "5"] },
  { id: "h4", name: "Vent d'Ouest", age: 3, sex: "Colt", breed: "Thoroughbred", color: "Bay", origin: "Mauritius", owner: "Pointe d'Or Syndicate", trainer: "Kevin Li-A-Young", stable: "Pointe d'Or Stables", wins: 5, places: 6, starts: 12, earnings: 820000, form: ["3", "1", "2", "1", "1"] },
  { id: "h5", name: "Marquis d'Argent", age: 5, sex: "Gelding", breed: "Thoroughbred", color: "Black", origin: "South Africa", owner: "R. Appadoo", trainer: "Jean-Marc Ferrière", stable: "Vallée Verte Stables", wins: 8, places: 11, starts: 26, earnings: 1610000, form: ["2", "2", "1", "3", "2"] },
  { id: "h6", name: "Fleur de Sel", age: 4, sex: "Filly", breed: "Thoroughbred", color: "Chestnut", origin: "Mauritius", owner: "Coralie Estates Ltd", trainer: "Alicia Ramtohul", stable: "Domaine Coralie", wins: 7, places: 5, starts: 17, earnings: 1230000, form: ["1", "4", "1", "2", "1"] },
  { id: "h7", name: "Roi des Sables", age: 7, sex: "Gelding", breed: "Thoroughbred", color: "Bay", origin: "Mauritius", owner: "S. Naidoo Bloodstock", trainer: "Kevin Li-A-Young", stable: "Baie du Cap Racing", wins: 16, places: 13, starts: 38, earnings: 3350000, form: ["1", "1", "2", "1", "3"] },
  { id: "h8", name: "Étincelle Bleue", age: 3, sex: "Filly", breed: "Thoroughbred", color: "Grey", origin: "France", owner: "Pointe d'Or Syndicate", trainer: "Kevin Li-A-Young", stable: "Pointe d'Or Stables", wins: 4, places: 4, starts: 10, earnings: 590000, form: ["2", "1", "1", "3", "2"] },
];

export const RACES: Race[] = [
  { id: "r1", name: "Coupe d'Or de Maurice", course: "Champ de Mars", date: "2026-09-06", time: "15:30", distance: "2000m", prize: 2500000, status: "upcoming", conditions: "Open handicap, 3yo+", entries: ["h1", "h3", "h7", "h5"] },
  { id: "r2", name: "Prix des Débutants", course: "Champ de Mars", date: "2026-09-06", time: "14:00", distance: "1200m", prize: 800000, status: "upcoming", conditions: "Maiden, 3yo", entries: ["h4", "h8"] },
  { id: "r3", name: "Trophée Vallée Verte", course: "Champ de Mars", date: "2026-09-13", time: "15:00", distance: "1600m", prize: 1200000, status: "upcoming", conditions: "Handicap, 4yo+", entries: ["h2", "h6", "h5"] },
  {
    id: "r4", name: "Grand Prix de Port Louis", course: "Champ de Mars", date: "2026-08-23", time: "15:30", distance: "2400m", prize: 3000000, status: "completed", conditions: "Group race, 4yo+", entries: ["h1", "h3", "h7"],
    result: [
      { pos: 1, horse: "h7", jockey: "D. Bissessur", time: "2:29.44" },
      { pos: 2, horse: "h1", jockey: "M. Sanmoogam", time: "2:29.81" },
      { pos: 3, horse: "h3", jockey: "T. Govinden", time: "2:30.02" },
    ],
  },
  {
    id: "r5", name: "Prix de la Baie du Cap", course: "Champ de Mars", date: "2026-08-16", time: "14:30", distance: "1400m", prize: 950000, status: "completed", conditions: "Handicap, 3yo+", entries: ["h2", "h6", "h4"],
    result: [
      { pos: 1, horse: "h6", jockey: "T. Govinden", time: "1:24.10" },
      { pos: 2, horse: "h2", jockey: "D. Bissessur", time: "1:24.33" },
      { pos: 3, horse: "h4", jockey: "A. Pillay", time: "1:24.55" },
    ],
  },
  {
    id: "r6", name: "Coupe des Apprentis", course: "Champ de Mars", date: "2026-08-09", time: "13:45", distance: "1000m", prize: 400000, status: "completed", conditions: "Apprentice riders only", entries: ["h8", "h4"],
    result: [
      { pos: 1, horse: "h8", jockey: "N. Rughoobur", time: "0:59.02" },
      { pos: 2, horse: "h4", jockey: "K. Beeharry", time: "0:59.40" },
    ],
  },
];

export const NEWS: NewsArticle[] = [
  { id: "n1", cat: "Race preview", title: "Coupe d'Or field takes shape as four rivals confirm", date: "2026-09-01", excerpt: "Île Royale headlines a strong field for Saturday's feature as connections weigh up the soft ground." },
  { id: "n2", cat: "Interview", title: "Trainer Alicia Ramtohul on Domaine Coralie's rise", date: "2026-08-29", excerpt: "From five horses to eleven in three seasons — the Moka handler on building a winning string." },
  { id: "n3", cat: "Race review", title: "Roi des Sables holds on in thrilling Grand Prix finish", date: "2026-08-23", excerpt: "A photo finish separated the top two as the seven-year-old added another feature to his record." },
  { id: "n4", cat: "Press release", title: "Champ de Mars announces upgraded starting stalls for new season", date: "2026-08-20", excerpt: "Officials confirm infrastructure upgrades ahead of the September meetings." },
  { id: "n5", cat: "Race preview", title: "Apprentices to watch this season", date: "2026-08-18", excerpt: "Two claimers are drawing early attention from stables looking for weight relief." },
  { id: "n6", cat: "Interview", title: "Jockey D. Bissessur on chasing a third straight title", date: "2026-08-12", excerpt: "The reigning champion discusses fitness, tactics, and this season's toughest rivals." },
];

export function horseById(id: string) {
  return HORSES.find((h) => h.id === id);
}
export function jockeyById(id: string) {
  return JOCKEYS.find((j) => j.id === id);
}
export function raceById(id: string) {
  return RACES.find((r) => r.id === id);
}
export function fmtMoney(n: number) {
  return "Rs " + n.toLocaleString("en-US");
}

export function search(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: { type: string; label: string; href: string }[] = [];
  HORSES.forEach((h) => h.name.toLowerCase().includes(q) && results.push({ type: "Horse", label: h.name, href: `/horses/${h.id}` }));
  JOCKEYS.forEach((j) => j.name.toLowerCase().includes(q) && results.push({ type: j.apprentice ? "Apprentice" : "Jockey", label: j.name, href: `/jockeys/${j.id}` }));
  TRAINERS.forEach((t) => t.name.toLowerCase().includes(q) && results.push({ type: "Trainer", label: t.name, href: "/trainers" }));
  OWNERS.forEach((o) => o.name.toLowerCase().includes(q) && results.push({ type: "Owner", label: o.name, href: "/owners" }));
  STABLES.forEach((s) => s.name.toLowerCase().includes(q) && results.push({ type: "Stable", label: s.name, href: "/stables" }));
  RACES.forEach((r) => r.name.toLowerCase().includes(q) && results.push({ type: "Race", label: r.name, href: `/races/${r.id}` }));
  NEWS.forEach((n) => n.title.toLowerCase().includes(q) && results.push({ type: "News", label: n.title, href: "/news" }));
  return results;
}
