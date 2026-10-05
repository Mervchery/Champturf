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

/** Existing notes for a race, so a re-scrape can skip re-translating unchanged text. */
export async function getRaceNotes(name, raceDate) {
  const { data } = await supabaseAdmin
    .from("races").select("racing_notes, racing_notes_en").eq("name", name).eq("race_date", raceDate).maybeSingle();
  return data ?? null;
}

export async function upsertRace({ name, raceDate, raceTime, distance, racingNotes, racingNotesEn, dangerHorse, sourceUrl }) {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("races").select("*").eq("name", name).eq("race_date", raceDate).maybeSingle();
  if (selectError) throw new Error(`Failed to look up race "${name}": ${selectError.message}`);

  const fields = {
    name, race_date: raceDate, race_time: raceTime, distance, course: "Champ de Mars",
    racing_notes: racingNotes, racing_notes_en: racingNotesEn, danger_horse: dangerHorse,
    source_url: sourceUrl, // lets the scheduler refresh just this race later
  };

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
/** Compares the freshly scraped prices with what is stored, so the site can show
 *  drift (price lengthening ▲) and firming (shortening ▼).
 *    *_open — first price ever seen · *_prev — the price before the latest change
 *    odds_changed_at — when the latest change was seen (only touched on a change) */
function oddsMovement(existing, win, place) {
  const out = {};
  let changed = false;
  const track = (current, key, prevKey, openKey) => {
    const stored = existing?.[key] ?? null;
    out[openKey] = existing?.[openKey] ?? stored ?? current ?? null;
    out[prevKey] = existing?.[prevKey] ?? null;
    if (current != null && stored != null && Number(current) !== Number(stored)) {
      out[prevKey] = stored;
      changed = true;
    }
  };
  track(win, "odds", "odds_prev", "odds_open");
  track(place, "place_odds", "place_odds_prev", "place_odds_open");
  if (changed) out.odds_changed_at = new Date().toISOString();
  return out;
}

export async function upsertEntry({ raceId, horseId, jockeyName, trainerName, gate, weightKg, runnerNo, winOdds, placeOdds, gear, isTipped }) {
  const jockey = jockeyName ? await findOrCreateJockey(jockeyName) : { id: null, created: false, updated: false };
  const trainer = trainerName ? await findOrCreateTrainer(trainerName) : { id: null, created: false, updated: false };

  const { data: existing } = await supabaseAdmin
    .from("race_entries")
    .select("odds, place_odds, odds_open, place_odds_open, odds_prev, place_odds_prev")
    .eq("race_id", raceId).eq("horse_id", horseId).maybeSingle();

  const { error } = await supabaseAdmin
    .from("race_entries")
    .upsert(
      { race_id: raceId, horse_id: horseId, jockey_id: jockey.id, trainer_id: trainer.id, gate, weight_kg: weightKg, runner_no: runnerNo ?? null,
        // Tote prices/gear/tip are re-written on every scrape so late price moves and gear changes are picked up.
        odds: winOdds ?? null, place_odds: placeOdds ?? null, gear: gear ?? null, is_tipped: !!isTipped,
        ...oddsMovement(existing, winOdds, placeOdds) },
      { onConflict: "race_id,horse_id" }
    );
  if (error) throw new Error(`Failed to upsert entry: ${error.message}`);
  return { jockey, trainer };
}

/** Race results store horse_id/jockey_id/trainer_id as the real
 *  relationship (per the same principle as entries). The legacy `jockey`
 *  text column is also kept populated — several existing pages read it
 *  directly, and there's no need to touch that frontend code to get the
 *  real relational data recorded correctly at the same time. `gate` is
 *  stored directly on the result row (not just on race_entries) since a
 *  race scraped as already-completed never gets a race_entries row at
 *  all — see scrape.mjs's `isResult` branch. */
export async function upsertResult({ raceId, horseId, position, jockeyName, trainerName, finishTime, margin, weightKg, gate, winOdds, placeOdds, gear, isTipped }) {
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
        gate: gate ?? null,
        win_odds: winOdds ?? null, place_odds: placeOdds ?? null, gear: gear ?? null, is_tipped: !!isTipped,
      },
      { onConflict: "race_id,position" }
    );
  if (error) throw new Error(`Failed to upsert result: ${error.message}`);
  return { jockey, trainer };
}

/** True when the horse is already stored with its owner and country of origin — i.e. its
 *  profile page has been scraped before and doesn't need fetching again (used by --fast). */
export async function horseHasProfile(name) {
  const { data } = await supabaseAdmin.from("horses").select("owner_id, origin").eq("name", name).maybeSingle();
  return !!(data && data.owner_id && data.origin);
}

/** True when the race is stored as completed and already has at least one result row. */
export async function isRaceCompleteInDb(name, raceDate) {
  const { data: race } = await supabaseAdmin
    .from("races").select("id, status").eq("name", name).eq("race_date", raceDate).maybeSingle();
  if (!race || race.status !== "completed") return false;
  const { count } = await supabaseAdmin
    .from("race_results").select("id", { count: "exact", head: true }).eq("race_id", race.id);
  return (count ?? 0) > 0;
}
