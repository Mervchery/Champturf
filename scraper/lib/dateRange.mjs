const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function parseSiteDate(str) {
  const [day, mon, year] = str.toLowerCase().split("-");
  const monthIdx = MONTHS.indexOf(mon);
  if (monthIdx === -1 || !day || !year) {
    throw new Error(`Could not parse date "${str}" — expected format like "06-sep-2026".`);
  }
  return new Date(Date.UTC(Number(year), monthIdx, Number(day)));
}

export function formatSiteDate(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const mon = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day}-${mon}-${year}`;
}

/** Inclusive list of every date string between start and end, in the
 *  site's own URL format. Used to walk a historical range day by day. */
export function dateRange(startStr, endStr) {
  const start = parseSiteDate(startStr);
  const end = parseSiteDate(endStr);
  if (start > end) {
    throw new Error(`Start date (${startStr}) is after end date (${endStr}).`);
  }
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(formatSiteDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}
