import * as cheerio from "cheerio";

// Splits the page on each entry's leading "N.  <pos-or-no> <gate>" marker
// (e.g. "1.  1st 5" once the race has run, or "1.  1 5" beforehand), then
// pulls the rest of each entry's fields out of the text between one
// marker and the next. Jockey is intentionally NOT parsed here — it's
// mashed together with the trainer's name with no separator on this page,
// so it's sourced from the horse's own profile page instead (see
// parseHorseProfile.mjs), which shows it cleanly.
const ENTRY_START = /(\d+)\.\s+(\d+)(st|nd|rd|th)?\s+(\d+)/g;

export function parseRacePage(html) {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");

  const headerMatch = text.match(/Race\s+(\d+)\s*:\s*([\d.]+)/);
  const raceNo = headerMatch ? Number(headerMatch[1]) : null;
  const timeOfDay = headerMatch ? headerMatch[2] : null;

  const nameMatch = text.match(/###\s*([^\n]+?)\n\s*(\d+)m/) || text.match(/([A-Z][^\n]{4,80})\n\s*(\d+)m/);
  const name = nameMatch ? nameMatch[1].trim() : null;
  const distance = nameMatch ? `${nameMatch[2]}m` : null;

  const isResult = /^Result\b/m.test(text) || /\d+(st|nd|rd|th)\s+\d+/.test(text);

  const starts = [...text.matchAll(ENTRY_START)];
  const entries = [];

  for (let i = 0; i < starts.length; i++) {
    const m = starts[i];
    const listNo = Number(m[1]);
    const firstNum = Number(m[2]);
    const ordinalSuffix = m[3] || null;
    const gate = Number(m[4]);
    const chunkStart = m.index;
    const chunkEnd = i + 1 < starts.length ? starts[i + 1].index : text.indexOf("Racing data from", chunkStart);
    const chunk = text.slice(chunkStart, chunkEnd === -1 ? undefined : chunkEnd);

    // Horse link isn't reliably present in the plain-text extraction, so
    // pull the i-th "/horse/<slug>" link from the raw HTML in document
    // order instead — this assumes entries appear in the same order as
    // the horse links on the page, which held in every example checked.
    const allHorseLinks = [...html.matchAll(/href="\/horse\/([a-z0-9-]+)"[^>]*>([^<]+)</g)];
    const horseSlug = allHorseLinks[i] ? allHorseLinks[i][1] : null;
    const horseName = allHorseLinks[i] ? allHorseLinks[i][2].trim() : null;

    const ageMatch = chunk.match(/Age\s+(\d+)/);
    const age = ageMatch ? Number(ageMatch[1]) : null;

    const weightMatch = chunk.match(/(\d+(?:[.-]\d+)?)\s*kg/);
    const weight = weightMatch ? parseFloat(weightMatch[1].replace("-", ".")) : null;

    // Stored verbatim as shown on the page (e.g. "1:31:86") rather than
    // reformatted — the source's own separator convention (colon between
    // seconds and hundredths, not a decimal point) isn't fully certain
    // from text extraction alone, so this avoids guessing wrong.
    const timeMatch = chunk.match(/(\d+:\d+(?::\d+)?)s\b/);
    const finishTime = timeMatch ? timeMatch[1] : null;

    entries.push({
      position: ordinalSuffix ? firstNum : null,
      runnerNo: ordinalSuffix ? null : firstNum,
      gate,
      horseName,
      horseSlug,
      age,
      weight,
      finishTime,
    });
  }

  return { raceNo, timeOfDay, name, distance, isResult, entries };
}
