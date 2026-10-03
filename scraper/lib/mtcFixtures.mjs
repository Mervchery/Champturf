import * as cheerio from "cheerio";

// Helpers for the Jockey Club fixtures calendar.
//
// The fixtures page loads each month's meetings from a small HTML feed:
//   /form-guide/fixture-calendar-partial?year=2026&month=10&nextMeetingId=394
// where every meeting is a ".calendar-card" with its day, month, a title and —
// once the card is published — a "View Race Card" link such as
//   /form-guide/fixtures/394/R1
// (394 = the meeting id; the other races are R2, R3… under the same id).

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");

/** "06-sep-2026" -> "2026-09-06" (null if it isn't that format). */
export function parseDateArg(token) {
  const m = /^(\d{1,2})-([a-z]{3})-(\d{4})$/i.exec(token ?? "");
  if (!m || !MONTHS[m[2].toLowerCase()]) return null;
  return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
}

export const isDateArg = (token) => parseDateArg(token) !== null;

export function inRange(iso, start, end) {
  return !!iso && iso >= start && iso <= end;
}

/** Every { year, month } from start to end (ISO dates), inclusive. */
export function monthsBetween(start, end) {
  const out = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push({ year: y, month: m });
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

/** The meetings in one month's calendar feed. `url` is null until the race card is published. */
export function parseCalendarCards(html, year, baseUrl) {
  const $ = cheerio.load(html);
  const cards = [];
  $(".calendar-card").each((_, card) => {
    const $c = $(card);
    const day = parseInt($c.find(".calendar-date .day").first().text().trim(), 10);
    const monthKey = $c.find(".calendar-date .month").first().text().trim().slice(0, 3).toLowerCase();
    const month = MONTHS[monthKey];
    if (!day || !month) return;

    const titles = $c.find(".title-group .title").map((_, t) => $(t).text().replace(/\s+/g, " ").trim()).get();
    const href = ($c.find(".button-group a[href]").first().attr("href") ?? "").trim();

    cards.push({
      date: `${year}-${pad(month)}-${pad(day)}`,
      meeting: titles[0] ?? null,          // "Meeting 17"
      title: titles[1] ?? null,            // "150th Anniversary Cup G3 - 990m"
      url: href ? new URL(href, baseUrl).toString() : null,
    });
  });
  return cards;
}
