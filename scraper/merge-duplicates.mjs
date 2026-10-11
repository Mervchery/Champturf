// Merges jockeys / trainers that exist twice under different spellings of the same name (see data/*.csv).
//
//   node scraper/merge-duplicates.mjs            preview only — prints what would be merged, changes nothing
//   node scraper/merge-duplicates.mjs --apply    does it
//
// For each person with 2+ rows, the row with the most results is kept (its name stays as it is); every
// reference to the other rows is moved onto it and the extra rows are deleted. Win/ride totals are recomputed.
import "./lib/loadEnv.mjs";
import { supabaseAdmin as db } from "./lib/supabaseAdmin.mjs";
import { personOf, squash, ambiguousAliases } from "./lib/personMatch.mjs";

const APPLY = process.argv.includes("--apply");

// table -> [[referencing table, column], ...]
const REFS = {
  jockeys: [["race_results", "jockey_id"], ["race_entries", "jockey_id"], ["jockeys", "mentor_id"]],
  trainers: [["race_results", "trainer_id"], ["race_entries", "trainer_id"], ["horses", "trainer_id"], ["stables", "trainer_id"]],
};
const RECOMPUTE = { jockeys: "recompute_jockey_stats", trainers: "recompute_trainer_stats" };
const PARAM = { jockeys: "p_jockey_id", trainers: "p_trainer_id" };

async function allRows(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select("id, name").order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function usage(table, id) {
  const col = table === "jockeys" ? "jockey_id" : "trainer_id";
  const { count } = await db.from("race_results").select("id", { count: "exact", head: true }).eq(col, id);
  return count ?? 0;
}

async function run(table, type) {
  const rows = await allRows(table);
  const groups = new Map();
  for (const r of rows) {
    const p = personOf(type, r.name);
    // known person -> grouped by person; anyone else only merges with an identical squashed spelling
    const key = p !== null ? `person:${p}` : `name:${squash(r.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  let merged = 0;
  for (const rowsOfPerson of groups.values()) {
    if (rowsOfPerson.length < 2) continue;
    const scored = await Promise.all(rowsOfPerson.map(async (r) => ({ ...r, n: await usage(table, r.id) })));
    scored.sort((a, b) => b.n - a.n || a.name.length - b.name.length);
    const [keep, ...dupes] = scored;
    console.log(`${table}: keep "${keep.name}" (${keep.n} results)  <-  ${dupes.map((d) => `"${d.name}" (${d.n})`).join(", ")}`);
    merged += dupes.length;
    if (!APPLY) continue;
    for (const d of dupes) {
      for (const [refTable, col] of REFS[table]) {
        const { error } = await db.from(refTable).update({ [col]: keep.id }).eq(col, d.id);
        if (error) throw new Error(`${refTable}.${col}: ${error.message}`);
      }
      const { error } = await db.from(table).delete().eq("id", d.id);
      if (error) throw new Error(`delete ${table} "${d.name}": ${error.message}`);
    }
    await db.rpc(RECOMPUTE[table], { [PARAM[table]]: keep.id });
  }
  console.log(`${table}: ${merged} duplicate row(s) ${APPLY ? "merged" : "found"}.`);
}

console.log(APPLY ? "APPLYING merges…" : "Preview only — add --apply to merge.");
await run("jockeys", "jockey");
await run("trainers", "trainer");
const amb = ambiguousAliases("trainer");
if (amb.length) console.log(`Not merged on purpose (the same spelling belongs to two different trainers): ${amb.join(", ")} — use scraper/lib/trainerOverrides.mjs for those.`);
