import { fetchHtml } from "./lib/fetchHtml.mjs";
import { parseRacePage } from "./lib/parseRacePage.mjs";
import { parseHorseProfile } from "./lib/parseHorseProfile.mjs";
import { upsertHorse, upsertRace, setRaceStatus, upsertEntry, upsertResult } from "./upsert.mjs";

const date = process.argv[2];
if (!date) {
  console.error("Usage: node scraper/scrape.mjs <date>   (e.g. node scraper/scrape.mjs 06-sep-2026)");
  console.error("Date format must match the one in the site's own URLs — check /racing/calendar on the site for the exact spelling.");
  process.exit(1);
}

const BASE = "https://supertote.mu";
const horseProfileCache = new Map(); // slug -> parsed profile, so each horse is only fetched once per run

async function getHorseProfile(slug) {
  if (horseProfileCache.has(slug)) return horseProfileCache.get(slug);
  console.log(`  fetching horse profile: ${slug}`);
  const html = await fetchHtml(`${BASE}/horse/${slug}`);
  const profile = parseHorseProfile(html, slug);
  horseProfileCache.set(slug, profile);
  return profile;
}

async function scrapeRace(raceUrl) {
  console.log(`Fetching race page: ${raceUrl}`);
  const html = await fetchHtml(raceUrl);
  const parsed = parseRacePage(html);

  if (!parsed.raceNo || !parsed.name) {
    console.warn(`  Could not parse race meta from ${raceUrl} — skipping. Inspect this page manually.`);
    return;
  }
  if (parsed.entries.length === 0) {
    console.warn(`  No entries parsed from ${raceUrl} — selectors may need adjusting for this page. Skipping.`);
    return;
  }

  // Convert the site's date format in the URL (e.g. "06-sep-2026") to
  // YYYY-MM-DD for the database.
  const [, urlDate] = raceUrl.match(/\/racing\/([a-z0-9-]+)\//i) || [];
  const raceDate = toIsoDate(urlDate);
  const raceTime = to24Hour(parsed.timeOfDay);

  const raceId = await upsertRace({ name: parsed.name, raceDate, raceTime, distance: parsed.distance });
  await setRaceStatus(raceId, parsed.isResult ? "completed" : "upcoming");
  console.log(`  Race: ${parsed.name} (${parsed.isResult ? "completed" : "upcoming"})`);

  for (const entry of parsed.entries) {
    if (!entry.horseSlug) {
      console.warn(`    Entry with no horse link found (gate ${entry.gate}) — skipping this runner.`);
      continue;
    }

    const profile = await getHorseProfile(entry.horseSlug);
    const horseId = await upsertHorse({
      name: profile.name,
      age: entry.age ?? profile.age,
      origin: profile.origin,
      trainerName: profile.trainerName,
      ownerName: profile.ownerName,
    });

    const timelineEntry = profile.timeline[raceUrl];
    const jockeyName = timelineEntry?.jockey ?? null;
    const weight = entry.weight ?? timelineEntry?.weight ?? null;

    if (parsed.isResult) {
      await upsertResult({ raceId, horseId, position: entry.position, jockeyName, finishTime: entry.finishTime });
      console.log(`    ${entry.position ?? "?"}. ${profile.name} (${jockeyName ?? "jockey unknown"})`);
    } else {
      await upsertEntry({ raceId, horseId, jockeyName, gate: entry.gate, weightKg: weight });
      console.log(`    Gate ${entry.gate}: ${profile.name} (${jockeyName ?? "jockey unknown"})`);
    }
  }
}

function toIsoDate(urlDate) {
  // "06-sep-2026" -> "2026-09-06"
  const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const [day, mon, year] = urlDate.split("-");
  return `${year}-${months[mon.toLowerCase()]}-${day.padStart(2, "0")}`;
}

function to24Hour(timeStr) {
  // The site shows "3.20" for 3:20pm-style afternoon times without an
  // explicit am/pm marker on the pages checked — Mauritian race meetings
  // run entirely in the afternoon, so this assumes PM. VERIFY against a
  // morning meeting if one ever exists; adjust here if so.
  if (!timeStr) return null;
  const [h, m] = timeStr.split(".");
  const hour = Number(h);
  const hour24 = hour < 12 ? hour + 12 : hour;
  return `${String(hour24).padStart(2, "0")}:${m.padEnd(2, "0")}`;
}

async function main() {
  const dayUrl = `${BASE}/racing/${date}`;
  console.log(`Fetching day page: ${dayUrl}`);
  const dayHtml = await fetchHtml(dayUrl);

  const raceLinks = [...new Set(
    [...dayHtml.matchAll(/href="(\/racing\/[a-z0-9-]+\/champ-de-mars-\d+)"/g)].map((m) => BASE + m[1])
  )];

  if (raceLinks.length === 0) {
    console.error("No race links found on the day page. Either there's no meeting on this date, or the page structure didn't match — inspect the page manually.");
    process.exit(1);
  }

  console.log(`Found ${raceLinks.length} races for ${date}.\n`);
  for (const raceUrl of raceLinks) {
    try {
      await scrapeRace(raceUrl);
    } catch (e) {
      console.error(`  Error scraping ${raceUrl}: ${e.message}`);
    }
    console.log("");
  }
  console.log("Done.");
}

main();
