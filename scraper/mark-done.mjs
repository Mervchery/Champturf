// Records finished checkpoints (zero dependencies). Run only after a successful scrape,
// with MARKS="full:2026-10-10,race:<id>:30m" — so a failed scrape is retried on the next tick.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const keys = (process.env.MARKS || "").split(",").map((s) => s.trim()).filter(Boolean);
if (keys.length === 0) process.exit(0);

const local = new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10); // Mauritius date
const res = await fetch(`${url}/rest/v1/scrape_checkpoints?on_conflict=dedupe_key`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
  body: JSON.stringify(keys.map((dedupe_key) => ({ dedupe_key, race_date: local }))),
});
if (!res.ok) { console.error(`[mark-done] ${res.status}: ${await res.text()}`); process.exit(1); }
console.log(`[mark-done] recorded ${keys.length} checkpoint(s): ${keys.join(", ")}`);
