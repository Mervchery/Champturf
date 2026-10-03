import "./lib/loadEnv.mjs"; // must be first — loads .env.local
import { mkdir, writeFile } from "node:fs/promises";
import { supabaseAdmin } from "./lib/supabaseAdmin.mjs";
import { fetchHtml } from "./lib/fetchHtml.mjs";
import { parseMtcRacePage } from "./lib/parseMtcRacePage.mjs";
import { normalizeName } from "./lib/normalize.mjs";
import { inRange, isDateArg, monthsBetween, parseCalendarCards, parseDateArg } from "./lib/mtcFixtures.mjs";

// Adds Jockey Club data to races that are already in the database:
//   race class, rails, real prize split, and per runner: rating, horse
//   weight (HWT), official gear (with changes) and the Time Factors table.
//
// Run the Supertote scraper for the dates first (it creates the races and
// entries), then either:
//
//   npm run scrape-mtc -- 04-oct-2026                  one day
//   npm run scrape-mtc -- 01-oct-2026 31-oct-2026      a date range
//   npm run scrape-mtc -- "<race-card link>"           one meeting, by link
//
// Date modes read the Jockey Club's monthly fixtures calendar to find each
// meeting's race card (/form-guide/fixtures/<meeting>/R1) and then follow its
// Race 2, 3… tabs. Meetings whose card isn't published yet are listed as
// skipped. Link mode does the same for a link you give it; --only skips the tabs.
// Options: --only  --max-pages=N (default 150, a safety limit)

const args = process.argv.slice(2);
const only = args.includes("--only");
const maxPages = Number((args.find((a) => a.startsWith("--max-pages=")) ?? "").split("=")[1]) || 150;
const positional = args.filter((a) => !a.startsWith("--"));
const dateArgs = positional.filter(isDateArg);
const urls = positional.filter((a) => /^https?:\/\//i.test(a));
const FIXTURES_URL = process.env.MTC_FIXTURES_URL || "https://www.mtcjockeyclub.com/form-guide/fixtures";

if (dateArgs.length === 0 && urls.length === 0) {
  console.error("Usage:");
  console.error("  npm run scrape-mtc -- 04-oct-2026");
  console.error("  npm run scrape-mtc -- 01-oct-2026 31-oct-2026");
  console.error('  npm run scrape-mtc -- "<Jockey Club race-card URL>" [more URLs] [--only]');
  process.exit(1);
}
if (dateArgs.length > 2) { console.error("Give one date, or a start and an end date."); process.exit(1); }

const stats = { races: 0, runners: 0, skipped: [], errors: [] };
const visited = new Set();

async function dumpDebug(url, html) {
  await mkdir("scraper/debug", { recursive: true });
  const file = `scraper/debug/mtc-${Date.now()}.html`;
  await writeFile(file, html);
  console.warn(`  Saved the page to ${file} so the selectors can be checked.`);
}

/** Fetch + parse one race-card page; null if it doesn't look like one. */
let pagesFetched = 0;
async function load(url) {
  if (visited.has(url)) return null;
  if (pagesFetched >= maxPages) throw new Error(`Reached the --max-pages limit (${maxPages}).`);
  visited.add(url);
  pagesFetched++;
  console.log(`Fetching: ${url}`);
  const html = await fetchHtml(url);
  const parsed = parseMtcRacePage(html);
  if (!parsed.raceNo || !parsed.name || parsed.runners.length === 0) {
    console.warn("  Could not read a race card from this page.");
    await dumpDebug(url, html);
    return null;
  }
  return parsed;
}

async function apply(parsed) {
  const { data: races, error } = await supabaseAdmin
    .from("races").select("id, name, race_time, status, prize").eq("race_date", parsed.date);
  if (error) throw new Error(error.message);

  const race =
    races.find((r) => normalizeName(r.name) === normalizeName(parsed.name)) ??
    races.find((r) => (r.race_time ?? "").slice(0, 5) === parsed.startTime);
  if (!race) {
    console.warn(`  "${parsed.name}" (${parsed.date}) isn't in the database yet — run the Supertote scraper for that date first.`);
    stats.skipped.push(`${parsed.date} ${parsed.name}`);
    return;
  }

  const raceUpdate = { race_class: parsed.raceClass, rails: parsed.rails };
  if (parsed.prizeSplit.length) raceUpdate.prize_split = parsed.prizeSplit;
  // Stake money = the race's total purse. Only filled in when empty, so a figure set by hand
  // (editing it re-runs the earnings maths) is never overwritten.
  if (!race.prize && parsed.stakeMoney) raceUpdate.prize = parsed.stakeMoney;
  const { error: raceErr } = await supabaseAdmin.from("races").update(raceUpdate).eq("id", race.id);
  if (raceErr) throw new Error(`Race update failed: ${raceErr.message}`);

  const { data: entries, error: entErr } = await supabaseAdmin
    .from("race_entries").select("id, horse_id, horses(name)").eq("race_id", race.id);
  if (entErr) throw new Error(entErr.message);
  if (!entries.length) {
    console.warn("  No declared entries for this race (already completed?) — race details saved, runner data skipped.");
  }

  let matched = 0;
  for (const runner of parsed.runners) {
    const entry = entries.find((e) => normalizeName(e.horses?.name) === normalizeName(runner.horseName));
    if (!entry) { console.warn(`    No entry for ${runner.horseName} — skipped.`); continue; }
    const tf = runner.timeFactors;
    const { error: upErr } = await supabaseAdmin.from("race_entries").update({
      rating: runner.rating,
      hwt: runner.hwt,
      hwt_last: runner.hwtLast,
      equip: runner.equip,
      gear_changed: runner.gearChanged,
      gear_prev: runner.gearPrev,
      tf_fastest: tf?.fastest ?? null,
      tf_days_since: tf?.daysSince ?? null,
      tf_best3: tf?.best3 ?? null,
    }).eq("id", entry.id);
    if (upErr) { stats.errors.push(`${runner.horseName}: ${upErr.message}`); continue; }
    // Keep the horse's headline rating current for upcoming races only (old cards mustn't overwrite it).
    if (race.status === "upcoming" && runner.rating != null) {
      await supabaseAdmin.from("horses").update({ rating: runner.rating }).eq("id", entry.horse_id);
    }
    matched++;
    console.log(`    ${runner.horseName}: rating ${runner.rating ?? "-"}, HWT ${runner.hwt ?? "-"}, equip ${runner.equip ?? "-"}${runner.gearChanged ? ` (was ${runner.gearPrev ?? "?"})` : ""}`);
  }
  stats.races++;
  stats.runners += matched;
}

/** Other races of the meeting, from the tab links ("R2" …). The base URL can
 *  end in the race name/id, so try the link both as-is and one level up. */
function tabCandidates(href, pageUrl) {
  const out = [new URL(href, pageUrl).toString()];
  const up = new URL(pageUrl);
  up.pathname = up.pathname.replace(/\/[^/]*\/?$/, "/");
  out.push(new URL(href, up).toString());
  return [...new Set(out)];
}

/** Process one race-card page and (unless --only) the other races of its meeting. */
async function processMeeting(url, preloaded = null) {
  try {
    const parsed = preloaded ?? (await load(url));
    if (!parsed) return;
    console.log(`  Race ${parsed.raceNo}: ${parsed.name} (${parsed.date})`);
    await apply(parsed);

    if (only) return;
    for (const href of parsed.tabLinks) {
      let done = false;
      for (const candidate of tabCandidates(href, url)) {
        try {
          const next = await load(candidate);
          if (!next) continue;
          console.log(`  Race ${next.raceNo}: ${next.name}`);
          await apply(next);
          done = true;
          break;
        } catch (err) {
          if (/max-pages/.test(err.message)) throw err;
        }
      }
      if (!done && !visited.has(new URL(href, url).toString())) {
        console.warn(`  Couldn't open the "${href}" tab — pass that race's link on its own.`);
        stats.skipped.push(`tab ${href}`);
      }
    }
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
    stats.errors.push(`${url}: ${err.message}`);
  }
}

if (dateArgs.length > 0) {
  // ---- Date / date-range mode: walk the monthly fixtures calendar ----
  const start = parseDateArg(dateArgs[0]);
  const end = parseDateArg(dateArgs[dateArgs.length - 1]);
  if (start > end) { console.error("The start date is after the end date."); process.exit(1); }

  console.log(`Looking for Jockey Club meetings from ${start} to ${end}…`);
  // The fixtures page tells us the "next meeting id" the calendar feed is asked with.
  const fixturesHtml = await fetchHtml(FIXTURES_URL);
  const nextMeetingId = (fixturesHtml.match(/fixtures\/(\d+)\/R\d/i) ?? [])[1];

  let found = 0;
  for (const { year, month } of monthsBetween(start, end)) {
    const feed = new URL("/form-guide/fixture-calendar-partial", FIXTURES_URL);
    feed.searchParams.set("year", String(year));
    feed.searchParams.set("month", String(month));
    if (nextMeetingId) feed.searchParams.set("nextMeetingId", nextMeetingId);

    let cards;
    try {
      cards = parseCalendarCards(await fetchHtml(feed.toString()), year, FIXTURES_URL);
    } catch (err) {
      console.warn(`  ${year}-${String(month).padStart(2, "0")}: couldn't load the calendar (${err.message})`);
      stats.errors.push(`calendar ${year}-${month}: ${err.message}`);
      continue;
    }

    const inMonth = cards.filter((c) => inRange(c.date, start, end));
    console.log(`  ${year}-${String(month).padStart(2, "0")}: ${inMonth.length} meeting(s) in range`);
    for (const card of inMonth) {
      found++;
      if (!card.url) {
        console.log(`    ${card.date} ${card.meeting ?? ""} ${card.title ?? ""} — race card not published yet, skipped.`);
        stats.skipped.push(`${card.date} (no race card yet)`);
        continue;
      }
      console.log(`    ${card.date} ${card.meeting ?? ""} — ${card.title ?? ""}`);
      await processMeeting(card.url);
    }
  }
  if (found === 0) console.warn("No meetings found in that range (the season runs April–December).");
} else {
  // ---- Link mode ----
  for (const url of urls) await processMeeting(url);
}

console.log(`\nDone: ${stats.races} race(s), ${stats.runners} runner(s) updated.`);
if (stats.skipped.length) console.log("Skipped:", stats.skipped.join("; "));
if (stats.errors.length) console.log("Errors:", stats.errors.join("; "));
