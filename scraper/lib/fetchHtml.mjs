// Deliberately slow and polite: one request in flight at a time, with a
// pause between each. This is a small operator's server, not a CDN — do
// not remove the delay or parallelize requests. Adjust DELAY_MS upward if
// you're scraping many pages in one run.
const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastFetchAt = 0;

export async function fetchHtml(url) {
  const wait = Math.max(0, DELAY_MS - (Date.now() - lastFetchAt));
  if (wait > 0) await sleep(wait);
  lastFetchAt = Date.now();

  const res = await fetch(url, {
    headers: {
      // Identifies this as a scraper, not a regular browser — replace the
      // contact info with your own before running this against someone
      // else's server.
      "User-Agent": "ChampTurfDataImport/1.0 (personal fan project; contact: you@example.com)",
    },
  });

  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}) for ${url}`);
  }
  return res.text();
}
