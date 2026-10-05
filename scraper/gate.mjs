// Decides — in about a second, with no npm install — whether the scheduled job should
// scrape right now, and exactly what. Zero dependencies on purpose, so a "nothing to do"
// run costs almost no CI time.
//
// All times Mauritius (UTC+4, no daylight saving).
//
//   Pre-race (06:00 & 18:00 cron, Thu–Sun or meeting ≤2 days away)
//       full scrape of the coming days. On a race day that is already in the database it
//       starts from TOMORROW — today is handled by the race-day checkpoints below.
//
//   Race day (5-minute cron) — each checkpoint runs ONCE, tracked in `scrape_checkpoints`:
//       6 h before Race 1      ONE full scrape of the whole card (all races)
//       2 h / 30 min / 10 min / 2 min before a race
//                              refresh ONLY that race (--url=<its page>)
//       after a race (+15 min) fetch ONLY that race's result until it is "completed"
//                              (needed so results and "finished" alerts appear)
//
// A checkpoint fires on the first 5-minute tick that is within 4 minutes of its target time
// (and never after the race has started), so each one lands at, or up to ~5 min before, its
// target — GitHub cron can't tick more often than every 5 minutes.
//
// Output: run=true|false, mode, args, marks (checkpoint keys to record after a successful scrape).
import { appendFileSync } from "node:fs";
import { formatSiteDate } from "./lib/dateRange.mjs";

const TZ_OFFSET_HOURS = 4;
const MIN = 60000;
const DAY_MS = 86400000;
const FULL_LEAD_MIN = 6 * 60;                 // full scrape: 6 h before Race 1
const RACE_LEADS_MIN = [120, 30, 10, 2];      // per-race checkpoints, minutes before the race
const EARLY_SLACK_MIN = 4;                    // fire when within 4 min of the target (cron ticks are 5 min apart)
const RESULT_AFTER_MIN = 15;                  // start fetching a result 15 min after the race time
const RESULT_UNTIL_MIN = 180;                 // …and give up 3 h after

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// GATE_NOW (ISO, UTC) lets you test a scenario without waiting for it: GATE_NOW=2026-10-10T05:00:00Z
const nowMs = process.env.GATE_NOW ? Date.parse(process.env.GATE_NOW) : Date.now();
const local = new Date(nowMs + TZ_OFFSET_HOURS * 3600 * 1000);
const iso = (d) => d.toISOString().slice(0, 10);
const today = iso(local);
const hour = local.getUTCHours();
const weekday = local.getUTCDay(); // 0 Sun … 6 Sat
const addDays = (isoDate, n) => iso(new Date(new Date(isoDate + "T00:00:00Z").getTime() + n * DAY_MS));
const toSite = (isoDate) => formatSiteDate(new Date(isoDate + "T00:00:00Z"));
const raceStartMs = (r) => Date.parse(`${r.race_date}T${(r.race_time || "12:00:00").slice(0, 8)}+04:00`);

const schedule = process.env.SCHEDULE || "";               // github.event.schedule
const manualMode = (process.env.MODE_INPUT || "").trim();   // "", auto, raceday, prerace
const manualDate = (process.env.DATE_INPUT || "").trim();   // optional, e.g. 2026-10-10
const isFiveMinute = schedule.startsWith("*/5");

function out(run, mode, args, marks, reason) {
  console.log(`[gate] ${today} ${String(hour).padStart(2, "0")}h wd=${weekday} → run=${run} mode=${mode} args="${args}" marks=${marks.length} (${reason})`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\nmode=${mode}\nargs=${args}\nmarks=${marks.join(",")}\n`);
  process.exit(0);
}
function fail(msg) {
  console.error(`[gate] ${msg}`);
  process.exit(1); // fail loudly (GitHub emails you) rather than guess and hammer the source site
}

if (manualDate) out(true, "manual", toSite(manualDate), [], `manual date ${manualDate}`);
if (manualMode === "raceday") out(true, "raceday", `--fast ${toSite(today)}`, [], "manual race-day run");
if (manualMode === "prerace") out(true, "prerace", `${toSite(today)} ${toSite(addDays(today, 4))}`, [], "manual pre-race run");

const headers = { apikey: key, Authorization: `Bearer ${key}` };
async function rest(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path.split("?")[0]}: ${await res.text()}`);
  return res.json();
}

let races, doneKeys;
try {
  races = await rest(`races?select=id,race_date,race_time,status,source_url&race_date=gte.${today}&race_date=lte.${addDays(today, 7)}&order=race_date.asc,race_time.asc&limit=500`);
  doneKeys = isFiveMinute ? new Set((await rest(`scrape_checkpoints?select=dedupe_key&race_date=eq.${today}&limit=500`)).map((r) => r.dedupe_key)) : new Set();
} catch (e) {
  fail(`could not read the database (did you run supabase/scrape_schedule_migration.sql?): ${e.message}`);
}

const todays = races.filter((r) => r.race_date === today);
const nextMeeting = races.length ? races[0].race_date : null;
const meetingSoon = nextMeeting && nextMeeting <= addDays(today, 2);

// ---- 5-minute trigger: race-day checkpoints ------------------------------------------
if (isFiveMinute) {
  if (hour < 5 || hour >= 21) out(false, "idle", "", [], "outside race-day hours");
  if (todays.length === 0) out(false, "idle", "", [], "no meeting today in the database");

  const race1 = raceStartMs(todays[0]);
  const lastRace = raceStartMs(todays[todays.length - 1]);
  const marks = [];
  const urls = new Set();
  let needsDayFallback = false;
  const reasons = [];

  // Checkpoint: ONE full-card scrape, 6 h before Race 1.
  const fullKey = `full:${today}`;
  const fullDue = !doneKeys.has(fullKey) && nowMs >= race1 - FULL_LEAD_MIN * MIN - EARLY_SLACK_MIN * MIN && nowMs < lastRace;

  // Checkpoints: single races at 2 h / 30 min / 10 min / 2 min before the off.
  for (const r of todays) {
    if (r.status === "completed") continue;
    const start = raceStartMs(r);
    if (nowMs >= start) continue; // already off — only the result sweep below applies
    const dueKeys = RACE_LEADS_MIN
      .filter((m) => nowMs >= start - m * MIN - EARLY_SLACK_MIN * MIN)
      .map((m) => `race:${r.id}:${m}m`)
      .filter((k) => !doneKeys.has(k));
    if (dueKeys.length === 0) continue;
    marks.push(...dueKeys);
    if (r.source_url) urls.add(r.source_url); else needsDayFallback = true;
    reasons.push(`race ${r.race_time?.slice(0, 5)} (${dueKeys.map((k) => k.split(":")[2]).join("+")})`);
  }

  // Result sweep: races that should have finished but aren't "completed" yet.
  for (const r of todays) {
    if (r.status === "completed") continue;
    const sinceStart = (nowMs - raceStartMs(r)) / MIN;
    if (sinceStart >= RESULT_AFTER_MIN && sinceStart < RESULT_UNTIL_MIN) {
      if (r.source_url) urls.add(r.source_url); else needsDayFallback = true;
      reasons.push(`result ${r.race_time?.slice(0, 5)}`);
    }
  }

  if (fullDue) {
    // The full scrape covers every race, so it replaces any single-race refresh due on this tick.
    out(true, "full-card", toSite(today), [fullKey, ...marks], "6 h before Race 1 — one full scrape of the card");
  }
  if (urls.size === 0 && !needsDayFallback) out(false, "idle", "", [], "no checkpoint due");
  if (needsDayFallback) {
    // A race has no stored page URL yet (first full scrape not done) — refresh the day once instead.
    out(true, "day-fallback", `--fast ${toSite(today)}`, marks, `missing source_url, refreshing the day: ${reasons.join("; ")}`);
  }
  out(true, "race-update", `--fast ${[...urls].map((u) => `--url=${u}`).join(" ")}`, marks, reasons.join("; "));
}

// ---- twice-daily trigger: pre-race refresh (Thursday → Sunday) -----------------------
const raceWeek = weekday === 0 || weekday >= 4; // Thu, Fri, Sat, Sun
if (raceWeek || meetingSoon) {
  // A race day already in the database is handled by the checkpoints above — don't scrape it twice.
  const from = todays.length > 0 ? addDays(today, 1) : today;
  out(true, "prerace", `${toSite(from)} ${toSite(addDays(today, 4))}`, [], raceWeek ? "race week (Thu–Sun)" : `meeting on ${nextMeeting}`);
}
out(false, "idle", "", [], "quiet day — next pre-race refresh starts Thursday");
