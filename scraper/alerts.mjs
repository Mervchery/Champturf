// Turns fresh scrape data into follower alerts. Runs right after scraper/scrape.mjs
// (see .github/workflows/scrape.yml) and is safe to run as often as you like: every alert
// has a dedupe key, so nobody is ever told the same thing twice.
//
//   declared  — a followed horse appears on an upcoming race card
//   odds      — its WIN price moved ≥15% (ALERT_ODDS_MIN_PCT) in the last 60 min
//   result    — it has finished (races from yesterday onwards only)
//
// Each alert is stored in `notifications` (in-app feed) and pushed to the member's devices.
// No VAPID keys configured → the in-app feed still works, push is simply skipped.
//
//   node scraper/alerts.mjs          send for real
//   node scraper/alerts.mjs --dry    print what would be sent, write nothing
import "./lib/loadEnv.mjs";
import { supabaseAdmin } from "./lib/supabaseAdmin.mjs";
import { buildMessage, oddsMove } from "./lib/alertMessages.mjs";

const DRY = process.argv.includes("--dry");
const MIN_PCT = Number(process.env.ALERT_ODDS_MIN_PCT || 0.15);
const ODDS_WINDOW_MIN = Number(process.env.ALERT_ODDS_WINDOW_MIN || 60);    // ignore price changes older than this
const ODDS_COOLDOWN_MIN = Number(process.env.ALERT_ODDS_COOLDOWN_MIN || 15); // max one odds alert per member+horse+race per 15 min
const DAY = 86400000;

const nowMs = Date.now();
const localToday = new Date(nowMs + 4 * 3600 * 1000).toISOString().slice(0, 10); // Mauritius date
const localYesterday = new Date(nowMs + 4 * 3600 * 1000 - DAY).toISOString().slice(0, 10);

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const unwrap = (res, what) => { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data ?? []; };

async function main() {
  const follows = unwrap(await supabaseAdmin.from("horse_follows").select("user_id, horse_id, notify_runs, notify_odds"), "load follows");
  if (follows.length === 0) return console.log("[alerts] nobody is following any horse yet.");

  const followersByHorse = new Map();
  for (const f of follows) {
    if (!followersByHorse.has(f.horse_id)) followersByHorse.set(f.horse_id, []);
    followersByHorse.get(f.horse_id).push(f);
  }
  const horseIds = [...followersByHorse.keys()];

  // ---- gather events -----------------------------------------------------------
  const rows = []; // candidate notifications
  const add = (f, kind, dedupe, ids, msg) =>
    rows.push({
      user_id: f.user_id, horse_id: ids.horseId, race_id: ids.raceId, kind,
      title: msg.en.title, body: msg.en.body, title_fr: msg.fr.title, body_fr: msg.fr.body,
      url: `/races/${ids.raceId}`, dedupe_key: dedupe,
    });

  for (const ids of chunk(horseIds, 80)) {
    const entries = unwrap(await supabaseAdmin
      .from("race_entries")
      .select("id, race_id, horse_id, runner_no, odds, odds_prev, odds_changed_at, horses(name), jockeys(name), races!inner(id, name, race_date, race_time, status)")
      .in("horse_id", ids).eq("races.status", "upcoming").gte("races.race_date", localToday), "load entries");

    for (const e of entries) {
      const race = e.races; const horse = e.horses?.name;
      if (!race || !horse) continue;
      const base = { horse, raceName: race.name, raceDate: race.race_date, raceTime: race.race_time };
      for (const f of followersByHorse.get(e.horse_id) ?? []) {
        if (f.notify_runs) {
          add(f, "declared", `declared:${e.race_id}:${e.horse_id}`, { horseId: e.horse_id, raceId: e.race_id },
            buildMessage("declared", { ...base, runnerNo: e.runner_no, jockey: e.jockeys?.name, odds: e.odds }));
        }
        if (f.notify_odds && e.odds_changed_at && nowMs - Date.parse(e.odds_changed_at) <= ODDS_WINDOW_MIN * 60000) {
          const move = oddsMove(e.odds_prev, e.odds, MIN_PCT);
          if (move) {
            add(f, "odds", `odds:${e.id}:${e.odds_changed_at}`, { horseId: e.horse_id, raceId: e.race_id },
              buildMessage("odds", { ...base, move }));
          }
        }
      }
    }

    const results = unwrap(await supabaseAdmin
      .from("race_results")
      .select("race_id, horse_id, position, jockey, horses(name), races!inner(id, name, race_date, race_time, status)")
      .in("horse_id", ids).eq("races.status", "completed").gte("races.race_date", localYesterday), "load results");

    for (const r of results) {
      const race = r.races; const horse = r.horses?.name;
      if (!race || !horse) continue;
      for (const f of followersByHorse.get(r.horse_id) ?? []) {
        if (!f.notify_runs) continue;
        add(f, "result", `result:${r.race_id}:${r.horse_id}`, { horseId: r.horse_id, raceId: r.race_id },
          buildMessage("result", { horse, raceName: race.name, raceDate: race.race_date, raceTime: race.race_time, position: r.position, jockey: r.jockey }));
      }
    }
  }

  // ---- odds cooldown: don't buzz the same person about the same runner every scrape ----
  let candidates = rows;
  const oddsUsers = [...new Set(rows.filter((r) => r.kind === "odds").map((r) => r.user_id))];
  if (oddsUsers.length) {
    const since = new Date(nowMs - ODDS_COOLDOWN_MIN * 60000).toISOString();
    const recent = [];
    for (const ids of chunk(oddsUsers, 80)) {
      recent.push(...unwrap(await supabaseAdmin.from("notifications").select("user_id, horse_id, race_id").eq("kind", "odds").gte("created_at", since).in("user_id", ids), "load recent odds alerts"));
    }
    const cooling = new Set(recent.map((n) => `${n.user_id}:${n.race_id}:${n.horse_id}`));
    const seen = new Set();
    candidates = rows.filter((r) => {
      if (r.kind !== "odds") return true;
      const k = `${r.user_id}:${r.race_id}:${r.horse_id}`;
      if (cooling.has(k) || seen.has(k)) return false; // also keeps one odds alert per runner within this batch
      seen.add(k);
      return true;
    });
  }

  console.log(`[alerts] ${follows.length} follows · ${candidates.length} candidate alerts${DRY ? " (dry run)" : ""}`);
  if (DRY) { for (const c of candidates) console.log(`  ${c.kind.padEnd(8)} ${c.user_id.slice(0, 8)}  ${c.title} — ${c.body}`); return; }
  if (candidates.length === 0) return;

  // ---- store (dedupe_key makes this idempotent; only genuinely new rows come back) ----
  const inserted = [];
  for (const part of chunk(candidates, 200)) {
    const res = await supabaseAdmin.from("notifications")
      .upsert(part, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
      .select("id, user_id, kind, title, body, title_fr, body_fr, url, horse_id, race_id");
    inserted.push(...unwrap(res, "store notifications"));
  }
  console.log(`[alerts] ${inserted.length} new in-app alerts stored.`);
  if (inserted.length === 0) return;

  await pushAll(inserted);
}

async function pushAll(notifications) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return console.log("[alerts] VAPID keys not set — skipping push (in-app feed only).");

  let webpush;
  try {
    webpush = (await import("web-push")).default;
  } catch {
    return console.warn("[alerts] the 'web-push' package isn't installed — run npm install. Skipping push.");
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${process.env.SCRAPER_CONTACT || "admin@example.com"}`, pub, priv);

  const userIds = [...new Set(notifications.map((n) => n.user_id))];
  const subs = [];
  for (const ids of chunk(userIds, 80)) {
    subs.push(...unwrap(await supabaseAdmin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth, lang").in("user_id", ids), "load push subscriptions"));
  }
  const subsByUser = new Map();
  for (const s of subs) { if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []); subsByUser.get(s.user_id).push(s); }

  const jobs = [];
  for (const n of notifications) for (const s of subsByUser.get(n.user_id) ?? []) jobs.push({ n, s });

  const delivered = new Set(); const dead = new Set(); let sent = 0, failed = 0;
  for (const batch of chunk(jobs, 10)) {
    await Promise.all(batch.map(async ({ n, s }) => {
      const fr = s.lang === "fr" && n.title_fr;
      const payload = JSON.stringify({
        title: fr ? n.title_fr : n.title,
        body: fr ? n.body_fr : n.body,
        url: n.url,
        tag: `${n.kind}:${n.race_id}:${n.horse_id}`, // a newer alert about the same runner replaces the older one
      });
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3 * 3600 });
        delivered.add(n.id); sent++;
      } catch (e) {
        failed++;
        if (e.statusCode === 404 || e.statusCode === 410) dead.add(s.id); // browser says this subscription is gone
        else console.warn(`[alerts] push failed (${e.statusCode ?? e.message})`);
      }
    }));
  }

  if (delivered.size) await supabaseAdmin.from("notifications").update({ pushed_at: new Date().toISOString() }).in("id", [...delivered]);
  if (dead.size) await supabaseAdmin.from("push_subscriptions").delete().in("id", [...dead]);
  console.log(`[alerts] push: ${sent} sent, ${failed} failed, ${dead.size} expired subscriptions removed.`);
}

main().catch((e) => { console.error("[alerts] failed:", e.message); process.exit(1); });
