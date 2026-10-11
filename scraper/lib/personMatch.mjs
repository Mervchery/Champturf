// Decides whether two spellings are the same jockey/trainer, using the alias list in personAliases.mjs.
// "B. Sooful", "B SOOFUL", "B.Sooful" and "Bawan Sooful" all squash to keys that belong to one person.
import { PEOPLE } from "./personAliases.mjs";

/** Letters and digits only, lower-case, accents removed: "S. Mahadia" -> "smahadia", "José" -> "jose". */
export function squash(name) {
  return String(name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildIndex(list) {
  const owners = new Map(); // squashed alias -> Set of person indexes
  list.forEach((p, i) => {
    for (const a of p.aliases) {
      const k = squash(a);
      if (!k) continue;
      if (!owners.has(k)) owners.set(k, new Set());
      owners.get(k).add(i);
    }
  });
  // An alias shared by two different people (e.g. "R. Gujadhur" for two trainers) can't identify either of
  // them, so it is never used to merge anything. Those cases are handled per horse in trainerOverrides.mjs.
  const ambiguous = new Set([...owners].filter(([, s]) => s.size > 1).map(([k]) => k));
  const byAlias = new Map();
  for (const [k, s] of owners) if (!ambiguous.has(k)) byAlias.set(k, [...s][0]);
  const keysOf = list.map((p) => new Set(p.aliases.map(squash).filter((k) => k && !ambiguous.has(k))));
  return { byAlias, keysOf, ambiguous, list };
}

const INDEX = { jockey: buildIndex(PEOPLE.jockey), trainer: buildIndex(PEOPLE.trainer) };

/** All squashed spellings that mean the same person as `name`. Unknown or ambiguous names -> just themselves. */
export function sameNameKeys(type, name) {
  const sq = squash(name);
  const idx = INDEX[type];
  const person = idx?.byAlias.get(sq);
  return person === undefined ? new Set([sq]) : idx.keysOf[person];
}

/** Index of the person this name belongs to (for grouping duplicates), or null. */
export function personOf(type, name) {
  const p = INDEX[type]?.byAlias.get(squash(name));
  return p === undefined ? null : p;
}

export const ambiguousAliases = (type) => [...(INDEX[type]?.ambiguous ?? [])];
export const personName = (type, i) => PEOPLE[type][i].name;
