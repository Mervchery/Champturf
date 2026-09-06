import { supabaseAdmin } from "./lib/supabaseAdmin.mjs";

async function findOrCreate(table, name, extraFields = {}) {
  if (!name) return null;
  const { data: existing } = await supabaseAdmin.from(table).select("id").eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabaseAdmin.from(table).insert({ name, ...extraFields }).select("id").single();
  if (error) throw new Error(`Failed to create ${table} "${name}": ${error.message}`);
  return created.id;
}

/** Upserts a horse's bio fields (age/origin/trainer/owner) — creates the
 *  trainer/owner records too if they don't exist yet. Never touches
 *  wins/seconds/thirds/unplaced/starts/earnings — those are trigger-owned. */
export async function upsertHorse({ name, age, origin, trainerName, ownerName }) {
  const trainerId = trainerName ? await findOrCreate("trainers", trainerName) : null;
  const ownerId = ownerName ? await findOrCreate("owners", ownerName) : null;

  const { data: existing } = await supabaseAdmin.from("horses").select("id").eq("name", name).maybeSingle();
  const fields = { name, age, origin, trainer_id: trainerId, owner_id: ownerId };

  if (existing) {
    const { error } = await supabaseAdmin.from("horses").update(fields).eq("id", existing.id);
    if (error) throw new Error(`Failed to update horse "${name}": ${error.message}`);
    return existing.id;
  }
  const { data: created, error } = await supabaseAdmin.from("horses").insert(fields).select("id").single();
  if (error) throw new Error(`Failed to create horse "${name}": ${error.message}`);
  return created.id;
}

export async function upsertRace({ name, raceDate, raceTime, distance }) {
  const { data, error } = await supabaseAdmin
    .from("races")
    .upsert(
      { name, race_date: raceDate, race_time: raceTime, distance, course: "Champ de Mars" },
      { onConflict: "name,race_date" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`Failed to upsert race "${name}": ${error.message}`);
  return data.id;
}

export async function setRaceStatus(raceId, status) {
  const { error } = await supabaseAdmin.from("races").update({ status }).eq("id", raceId);
  if (error) throw new Error(`Failed to set race status: ${error.message}`);
}

export async function upsertEntry({ raceId, horseId, jockeyName, gate, weightKg }) {
  const jockeyId = jockeyName ? await findOrCreate("jockeys", jockeyName) : null;
  const { error } = await supabaseAdmin
    .from("race_entries")
    .upsert(
      { race_id: raceId, horse_id: horseId, jockey_id: jockeyId, gate, weight_kg: weightKg },
      { onConflict: "race_id,horse_id" }
    );
  if (error) throw new Error(`Failed to upsert entry: ${error.message}`);
}

export async function upsertResult({ raceId, horseId, position, jockeyName, finishTime }) {
  const { error } = await supabaseAdmin
    .from("race_results")
    .upsert(
      { race_id: raceId, horse_id: horseId, position, jockey: jockeyName ?? "Unknown", finish_time: finishTime },
      { onConflict: "race_id,position" }
    );
  if (error) throw new Error(`Failed to upsert result: ${error.message}`);
}
