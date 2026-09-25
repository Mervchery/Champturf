import { supabaseAdmin } from "./lib/supabaseAdmin.mjs";
import { normalizeName } from "./lib/normalize.mjs";

/** Generic find-or-update-or-create for a name-keyed table (jockeys,
 *  trainers, owners, stables). Matches on normalized_name (see
 *  scraper_normalization_migration.sql) so "D. Schwarz", "D Schwarz",
 *  and "d.schwarz" all resolve to the same row instead of creating
 *  duplicates. Only writes an UPDATE when a field actually differs from
 *  what's stored, so re-scraping unchanged data doesn't churn the table
 *  or inflate the "updated" count in the final stats. */
async function findOrCreateNamed(table, name, extraFields = {}) {
  if (!name) return { id: null, created: false, updated: false };
  const normalized = normalizeName(name);

  const { data: existing, error: selectError } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (selectError) throw new Error(`Failed to look up ${table} "${name}": ${selectError.message}`);

  if (existing) {
    const updates = {};
    for (const [key, value] of Object.entries(extraFields)) {
      if (value !== undefined && value !== null && value !== existing[key]) {
        updates[key] = value;
      }
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from(table).update(updates).eq("id", existing.id);
      if (error) throw new Error(`Failed to update ${table} "${name}": ${error.message}`);
      return { id: existing.id, created: false, updated: true };
    }
    return { id: existing.id, created: false, updated: false };
  }

  const { data: created, error } = await supabaseAdmin.from(table).insert({ name, ...extraFields }).select("id").single();
  if (error) throw new Error(`Failed to create ${table} "${name}": ${error.message}`);
  return { id: created.id, created: true, updated: false };
}

export const findOrCreateJockey = (name, extra = {}) => findOrCreateNamed("jockeys", name, extra);
export const findOrCreateTrainer = (name, extra = {}) => findOrCreateNamed("trainers", name, extra);
export const findOrCreateOwner = (name, extra = {}) => findOrCreateNamed("owners", name, extra);

/** Upserts a horse's bio fields (age/origin/trainer/owner) — creates the
 *  trainer/owner records too if they don't exist yet (via the functions
 *  above, so they get the same normalized-name dedup). Never touches
 *  wins/seconds/thirds/unplaced/starts/earnings — those are trigger-owned. */
export async function upsertHorse({ name, age, origin, trainerName, ownerName, silkImageUrl }) {
  const trainer = trainerName ? await findOrCreateTrainer(trainerName) : { id: null, created: false, updated: false };
  const owner = ownerName ? await findOrCreateOwner(ownerName) : { id: null, created: false, updated: false };

  const fields = { age, origin, trainer_id: trainer.id, owner_id: owner.id, silk_image_url: silkImageUrl };
  const { data: existing, error: selectError } = await supabaseAdmin.from("horses").select("*").eq("name", name).maybeSingle();
  if (selectError) throw new Error(`Failed to look up horse "${name}": ${selectError.message}`);

  if (existing) {
    const updates = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== existing[key]) updates[key] = value;
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from("horses").update(updates).eq("id", existing.id);
      if (error) throw new Error(`Failed to update horse "${name}": ${error.message}`);
      return { id: existing.id, created: false, updated: true, trainer, owner };
    }
    return { id: existing.id, created: false, updated: false, trainer, owner };
  }

  const { data: created, error } = await supabaseAdmin.from("horses").insert({ name, ...fields }).select("id").single();
  if (error) throw new Error(`Failed to create horse "${name}": ${error.message}`);
  return { id: created.id, created: true, updated: false, trainer, owner };
}

export async function upsertRace({ name, raceDate, raceTime, distance }) {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("races").select("*").eq("name", name).eq("race_date", raceDate).maybeSingle();
  if (selectError) throw new Error(`Failed to look up race "${name}": ${selectError.message}`);

  const fields = { name, race_date: raceDate, race_time: raceTime, distance, course: "Champ de Mars" };

  if (existing) {
    const updates = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== existing[key]) updates[key] = value;
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from("races").update(updates).eq("id", existing.id);
      if (error) throw new Error(`Failed to update race "${name}": ${error.message}`);
      return { id: existing.id, created: false, updated: true };
    }
    return { id: existing.id, created: false, updated: false };
  }

  const { data: created, error } = await supabaseAdmin.from("races").insert(fields).select("id").single();
  if (error) throw new Error(`Failed to create race "${name}": ${error.message}`);
  return { id: created.id, created: true, updated: false };
}

export async function setRaceStatus(raceId, status) {
  const { error } = await supabaseAdmin.from("races").update({ status }).eq("id", raceId);
  if (error) throw new Error(`Failed to set race status: ${error.message}`);
}

/** Race entries store horse_id/jockey_id/trainer_id — never names — as
 *  the actual relationship. jockeyName/trainerName here are just the
 *  scraped text used to resolve (or create) the linked row. */
export async function upsertEntry({ raceId, horseId, jockeyName, trainerName, gate, weightKg }) {
  const jockey = jockeyName ? await findOrCreateJockey(jockeyName) : { id: null, created: false, updated: false };
  const trainer = trainerName ? await findOrCreateTrainer(trainerName) : { id: null, created: false, updated: false };

  const { error } = await supabaseAdmin
    .from("race_entries")
    .upsert(
      { race_id: raceId, horse_id: horseId, jockey_id: jockey.id, trainer_id: trainer.id, gate, weight_kg: weightKg },
      { onConflict: "race_id,horse_id" }
    );
  if (error) throw new Error(`Failed to upsert entry: ${error.message}`);
  return { jockey, trainer };
}

/** Race results store horse_id/jockey_id/trainer_id as the real
 *  relationship (per the same principle as entries). The legacy `jockey`
 *  text column is also kept populated — several existing pages read it
 *  directly, and there's no need to touch that frontend code to get the
 *  real relational data recorded correctly at the same time. */
export async function upsertResult({ raceId, horseId, position, jockeyName, trainerName, finishTime, margin, weightKg }) {
  const jockey = jockeyName ? await findOrCreateJockey(jockeyName) : { id: null, created: false, updated: false };
  const trainer = trainerName ? await findOrCreateTrainer(trainerName) : { id: null, created: false, updated: false };

  const { error } = await supabaseAdmin
    .from("race_results")
    .upsert(
      {
        race_id: raceId, horse_id: horseId, position,
        jockey_id: jockey.id, trainer_id: trainer.id,
        jockey: jockeyName ?? "Unknown",
        finish_time: finishTime, margin: margin ?? null, weight_kg: weightKg,
      },
      { onConflict: "race_id,position" }
    );
  if (error) throw new Error(`Failed to upsert result: ${error.message}`);
  return { jockey, trainer };
}
