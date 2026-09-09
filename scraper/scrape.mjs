import { writeFile, mkdir } from "node:fs/promises";
import { fetchHtml } from "./lib/fetchHtml.mjs";
import { parseRacePage } from "./lib/parseRacePage.mjs";
import { parseHorseProfile } from "./lib/parseHorseProfile.mjs";
import { dateRange } from "./lib/dateRange.mjs";
import { upsertHorse, upsertRace, setRaceStatus, upsertEntry, upsertResult } from "./upsert.mjs";

const args = process.argv.slice(2);
if (args.length === 0 || args.length > 2) {
  console.error("Usage:");
  console.error("  node scraper/scrape.mjs <date>              e.g. node scraper/scrape.mjs 06-sep-2026");
  console.error("  node scraper/scrape.mjs <start> <end>       e.g. node scraper/scrape.mjs 01-jan-2020 06-sep-2026");
  console.error("Date format must match the site's own URLs (DD-mon-YYYY).");
  process.exit(1);
}

const BASE = "https://supertote.mu";
const horseProfileCache = new Map(); // slug -> parsed profile — persists across the whole run, even a multi-year one

// ---------------------------------------------------------------------
// Stats — printed once at the end (requirement: full run summary)
// ---------------------------------------------------------------------
const stats = {
  datesProcessed: 0,
  datesSkipped: 0,
  racesProcessed: 0,
  horsesAdded: 0, horsesUpdated: 0,
  jockeysAdded: 0, jockeysUpdated: 0,
  trainersAdded: 0, trainersUpdated: 0,
  ownersAdded: 0, ownersUpdated: 0,
  entriesImported: 0,
  resultsImported: 0,
  errors: [], // { context, message }
};

function track(kind, result) {
  if (!result) return;
  if (result.created) stats[`${kind}Added`]++;
  else if (result.updated) stats[`${kind}Updated`]++;
}

function printStats() {
  const s = stats;
  console.log("\n========================================");
  console.log("Scrape run complete");
  console.log("========================================");
  console.log(`Dates processed:     ${s.datesProcessed}`);
  console.log(`Dates skipped (no races): ${s.datesSkipped}`);
  console.log(`Races processed:     ${s.racesProcessed}`);
  console.log(`Horses added/updated:   ${s.horsesAdded} / ${s.horsesUpdated}`);
  console.log(`Jockeys added/updated:  ${s.jockeysAdded} / ${s.jockeysUpdated}`);
  console.log(`Trainers added/updated: ${s.trainersAdded} / ${s.trainersUpdated}`);
  console.log(`Owners added/updated:   ${s.ownersAdded} / ${s.ownersUpdated}`);
  console.log(`Entries imported:    ${s.entriesImported}`);
  console.log(`Results imported:    ${s.resultsImported}`);
  console.log(`Errors:              ${s.errors.length}`);
  if (s.errors.length > 0) {
    console.log("\nError details:");
    for (const e of s.errors) console.log(`  - [${e.context}] ${e.message}`);
  }
  console.log("========================================");
}

async function dumpDebugHtml(url, html) {
  await mkdir("scraper/debug", { recursive: true });
  const safeName = url.replace(/[^a-z0-9]/gi, "_").slice(-80);
  const path = `scraper/debug/${safeName}.html`;
  await writeFile(path, html, "utf-8");
  console.warn(`    Saved the raw page to ${path} — share this file's content to get the parser fixed for real.`);
}

async function getHorseProfile(slug) {
  if (horseProfileCache.has(slug)) return horseProfileCache.get(slug);
  console.log(`  fetching horse profile: ${slug}`);
  const html = await fetchHtml(`${BASE}/horse/${slug}`);
  const profile = parseHorseProfile(html, slug);
  horseProfileCache.set(slug, profile);
  return profile;
}

function toIsoDate(urlDate) {
  // "06-sep-2026" -> "2026-09-06"
  const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const [day, mon, year] = urlDate.split("-");
  return `${year}-${months[mon.toLowerCase()]}-${day.padStart(2, "0")}`;
}

function to24Hour(timeStr) {
  // The site shows "3.20" for afternoon times with no explicit am/pm —
  // Mauritian meetings run entirely in the afternoon, so this assumes PM.
  if (!timeStr) return null;
  const [h, m] = timeStr.split(".");
  const hour = Number(h);
  const hour24 = hour < 12 ? hour + 12 : hour;
  return `${String(hour24).padStart(2, "0")}:${m.padEnd(2, "0")}`;
}

async function scrapeRace(raceUrl) {
  console.log(`Fetching race page: ${raceUrl}`);
  const html = await fetchHtml(raceUrl);
  const parsed = parseRacePage(html);

  if (!parsed.raceNo || !parsed.name) {
    console.warn(`  Could not parse race meta from ${raceUrl} — skipping. Inspect this page manually.`);
    await dumpDebugHtml(raceUrl, html);
    stats.errors.push({ context: raceUrl, message: "Could not parse race meta" });
    return;
  }
  if (parsed.entries.length === 0) {
    console.warn(`  No entries parsed from ${raceUrl} — selectors may need adjusting for this page. Skipping.`);
    await dumpDebugHtml(raceUrl, html);
    stats.errors.push({ context: raceUrl, message: "No entries parsed" });
    return;
  }

  const [, urlDate] = raceUrl.match(/\/racing\/([a-z0-9-]+)\//i) || [];
  const raceDate = toIsoDate(urlDate);
  const raceTime = to24Hour(parsed.timeOfDay);

  const race = await upsertRace({ name: parsed.name, raceDate, raceTime, distance: parsed.distance });
  await setRaceStatus(race.id, parsed.isResult ? "completed" : "upcoming");
  console.log(`  Race: ${parsed.name} (${parsed.isResult ? "completed" : "upcoming"})`);

  for (const entry of parsed.entries) {
    if (!entry.horseSlug) {
      console.warn(`    Entry with no horse link found (gate ${entry.gate}) — skipping this runner.`);
      stats.errors.push({ context: raceUrl, message: `No horse link for gate ${entry.gate}` });
      continue;
    }

    try {
      // Jockey/trainer come straight from the race page. The horse
      // profile fetch is only for origin/owner, which aren't on this page.
      const profile = await getHorseProfile(entry.horseSlug);
      const horse = await upsertHorse({
        name: entry.horseName ?? profile.name,
        age: entry.age ?? profile.age,
        origin: profile.origin,
        trainerName: entry.trainer ?? profile.trainerName,
        ownerName: profile.ownerName,
      });
      track("horses", horse);
      track("trainers", horse.trainer);
      track("owners", horse.owner);

      if (parsed.isResult) {
        if (entry.position == null) {
          console.log(`    Scratched/DNF: ${entry.horseName} — horse record updated, no result row written.`);
          continue;
        }
        const result = await upsertResult({
          raceId: race.id, horseId: horse.id, position: entry.position,
          jockeyName: entry.jockey, trainerName: entry.trainer,
          finishTime: entry.finishTime, margin: null, weightKg: entry.weight,
        });
        track("jockeys", result.jockey);
        track("trainers", result.trainer);
        stats.resultsImported++;
        console.log(`    ${entry.position}. ${entry.horseName} (${entry.jockey ?? "jockey unknown"})`);
      } else {
        const result = await upsertEntry({
          raceId: race.id, horseId: horse.id,
          jockeyName: entry.jockey, trainerName: entry.trainer,
          gate: entry.gate, weightKg: entry.weight,
        });
        track("jockeys", result.jockey);
        track("trainers", result.trainer);
        stats.entriesImported++;
        console.log(`    Gate ${entry.gate}: ${entry.horseName} (${entry.jockey ?? "jockey unknown"})`);
      }
    } catch (e) {
      stats.errors.push({ context: `${raceUrl} / ${entry.horseName ?? entry.horseSlug}`, message: e.message });
      console.error(`    Error processing ${entry.horseName ?? entry.horseSlug}: ${e.message}`);
    }
  }

  stats.racesProcessed++;
}

/** Scrapes one day. Returns true if any races were found, false if the
 *  day genuinely has no meeting (not an error — just skip and move on). */
async function scrapeDay(date) {
  const dayUrl = `${BASE}/racing/${date}`;
  console.log(`\n=== ${date} ===`);

  const dayHtml = await fetchHtml(dayUrl); // lets a real fetch failure bubble up as an error for this date

  const raceLinks = [...new Set(
    [...dayHtml.matchAll(/href="(\/racing\/[a-z0-9-]+\/champ-de-mars-\d+)"/g)].map((m) => BASE + m[1])
  )];

  if (raceLinks.length === 0) {
    console.log("  No races found — skipping.");
    return false;
  }

  console.log(`  Found ${raceLinks.length} races.`);
  for (const raceUrl of raceLinks) {
    try {
      await scrapeRace(raceUrl);
    } catch (e) {
      stats.errors.push({ context: raceUrl, message: e.message });
      console.error(`  Error scraping ${raceUrl}: ${e.message}`);
    }
  }
  return true;
}

async function main() {
  const dates = args.length === 1 ? [args[0]] : dateRange(args[0], args[1]);

  if (dates.length > 1) {
    console.log(`Scraping ${dates.length} dates from ${dates[0]} to ${dates[dates.length - 1]}.`);
    console.log("This can take a long time for a large range — the scraper is deliberately rate-limited (see scraper/lib/fetchHtml.mjs) to be respectful of the source server.\n");
  }

  for (const date of dates) {
    try {
      const found = await scrapeDay(date);
      stats.datesProcessed++;
      if (!found) stats.datesSkipped++;
    } catch (e) {
      stats.errors.push({ context: `date ${date}`, message: e.message });
      console.error(`Error processing ${date}: ${e.message}`);
      stats.datesProcessed++;
    }
  }

  printStats();
}

main();
