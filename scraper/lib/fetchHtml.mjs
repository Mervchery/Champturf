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

  // An honest identity. Set SCRAPER_CONTACT in .env.local to a real email
  // (placeholder addresses are a common reason servers refuse a client).
  const contact = process.env.SCRAPER_CONTACT || "set SCRAPER_CONTACT in .env.local";
  const res = await fetch(url, {
    headers: {
      "User-Agent": `ChampTurfDataImport/1.0 (personal fan project; contact: ${contact})`,
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  if (res.status === 403 || res.status === 429) {
    throw new Error(
      `The server refused the request (${res.status}) for ${url}. ` +
      "That site doesn't allow automated access from here. Don't retry in a loop — ask the site owner to allow it."
    );
  }
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}) for ${url}`);
  }
  return res.text();
}
