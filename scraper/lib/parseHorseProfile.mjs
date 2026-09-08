import * as cheerio from "cheerio";
import { resolveOrigin } from "./originCodes.mjs";

// NOTE ON ROBUSTNESS: these patterns anchor on literal label text ("Age:",
// "Trainer:", "Owners:") rather than CSS classes, since I don't have a
// real horse-profile HTML dump to verify exact selectors against (only
// race pages have been confirmed against real HTML so far — see
// parseRacePage.mjs). Test this against one real horse page and, if
// fields come out wrong, share the saved debug HTML the same way the
// race page parser was fixed.
//
// This only needs to supply origin and owner — trainer, age, and jockey
// are all read directly and reliably from the race page instead
// (parseRacePage.mjs), which has real verified selectors.

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

  return { slug, name, origin: resolveOrigin(originCode), age, trainerName, ownerName };
}
