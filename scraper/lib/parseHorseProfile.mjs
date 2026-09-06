import * as cheerio from "cheerio";
import { resolveOrigin } from "./originCodes.mjs";

// NOTE ON ROBUSTNESS: these patterns anchor on literal label text ("Age:",
// "Trainer:", "Owners:") and stable punctuation (parentheses around origin
// code, "kg" after weight) rather than CSS classes, since those survive
// almost any markup change or theme update. Still — test against a live
// page before a full run, and adjust here if the site's wording changes.

export function parseHorseProfile(html, slug) {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const nameMatch = text.match(/Horse Profile\s*([^(]+?)\s*\(([^)]+)\)/);
  const name = nameMatch ? nameMatch[1].trim() : slug;
  const originCode = nameMatch ? nameMatch[2].trim() : null;

  const ageMatch = text.match(/Age:\s*(\d+)/);
  const age = ageMatch ? Number(ageMatch[1]) : null;

  const trainerMatch = text.match(/Trainer:\s*([^\n]+?)(?=\s*(?:Owners?:|Most Recent Race|Upcoming Races|Previous Results|$))/);
  const trainerName = trainerMatch ? trainerMatch[1].trim() : null;

  const ownerMatch = text.match(/Owners?:\s*([^\n]+?)(?=\s*(?:Most Recent Race|Upcoming Races|Previous Results|$))/);
  const ownerName = ownerMatch ? ownerMatch[1].trim() : null;

  // Per-race jockey/weight, keyed by race URL — pulled from both the
  // "Upcoming Races" and "Previous Results" lists. Pattern: a race link,
  // then eventually "<form/gate stuff>  <Jockey Name> <weight>kg" before
  // the next race link or end of section. Position/gate are NOT extracted
  // here — that's ambiguous on this page (too many other numbers nearby);
  // the race page itself is a much more reliable source for those.
  const timeline = {};
  const raceLinkRegex = /https:\/\/supertote\.mu\/racing\/([a-z0-9-]+)\/champ-de-mars-(\d+)/g;
  const links = [...html.matchAll(raceLinkRegex)];

  for (let i = 0; i < links.length; i++) {
    const raceUrl = links[i][0];
    const startIdx = links[i].index;
    const endIdx = i + 1 < links.length ? links[i + 1].index : html.length;
    const chunkHtml = html.slice(startIdx, Math.min(endIdx, startIdx + 2000));
    const chunkText = cheerio.load(chunkHtml)("body").text().replace(/\s+/g, " ").trim();

    // Jockey name immediately precedes a "<number>kg" or "<number>-<number>kg" weight.
    const jockeyWeightMatch = chunkText.match(/([A-Z][A-Za-z.'\- ]{2,30}?)\s+(\d+(?:[.-]\d+)?)\s*kg/);
    const weight = jockeyWeightMatch ? parseFloat(jockeyWeightMatch[2].replace("-", ".")) : null;
    const jockey = jockeyWeightMatch ? jockeyWeightMatch[1].trim() : null;

    if (!timeline[raceUrl]) {
      timeline[raceUrl] = { jockey, weight };
    }
  }

  return { slug, name, origin: resolveOrigin(originCode), age, trainerName, ownerName, timeline };
}
