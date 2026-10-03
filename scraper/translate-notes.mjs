import "./lib/loadEnv.mjs"; // must be first
import { supabaseAdmin } from "./lib/supabaseAdmin.mjs";
import { translateNotes } from "./lib/translateNotes.mjs";

// Fills races.racing_notes_en for races that were imported before translation
// existed (or whose translation failed). Safe to re-run; only touches races
// that have notes but no English version yet.
//
//   npm run translate-notes
//
// With ANTHROPIC_API_KEY in .env.local it uses Claude (best quality);
// otherwise it falls back to the free MyMemory service.

const { data: races, error } = await supabaseAdmin
  .from("races")
  .select("id, name, race_date, racing_notes, danger_horse")
  .not("racing_notes", "is", null)
  .or("racing_notes_en.is.null,racing_notes_en.eq.")
  .order("race_date", { ascending: false });
if (error) { console.error(error.message); process.exit(1); }

console.log(`${races.length} race(s) need an English version of their notes.`);
let done = 0, failed = 0;

for (const race of races) {
  const [entries, results] = await Promise.all([
    supabaseAdmin.from("race_entries").select("horses(name, trainer:trainers(name)), jockeys(name)").eq("race_id", race.id),
    supabaseAdmin.from("race_results").select("horses(name, trainer:trainers(name)), jockeys(name), trainers(name)").eq("race_id", race.id),
  ]);
  const names = [race.danger_horse];
  for (const row of [...(entries.data ?? []), ...(results.data ?? [])]) {
    names.push(row.horses?.name, row.horses?.trainer?.name, row.jockeys?.name, row.trainers?.name);
  }

  const en = await translateNotes(race.racing_notes, names);
  if (!en) { failed++; console.log(`  ✗ ${race.race_date} ${race.name}`); continue; }
  const { error: upErr } = await supabaseAdmin.from("races").update({ racing_notes_en: en }).eq("id", race.id);
  if (upErr) { failed++; console.log(`  ✗ ${race.race_date} ${race.name}: ${upErr.message}`); continue; }
  done++;
  console.log(`  ✓ ${race.race_date} ${race.name}`);
  await new Promise((r) => setTimeout(r, 1200)); // be polite to the translation service
}
console.log(`Done: ${done} translated, ${failed} failed.`);
