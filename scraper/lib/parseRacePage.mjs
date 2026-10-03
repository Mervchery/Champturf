import * as cheerio from "cheerio";

// Rebuilt from real page HTML (not just text extraction) after the first
// version's text-pattern guessing failed on live pages. These selectors
// are verified against 8 real race result pages — see the project's
// commit history / conversation for the validation.
//
// Weight sometimes carries an adjustment with no space before "kg", e.g.
// "52+1kg" (overweight) or "57.5-4kg" (apprentice claim) — this is parsed
// as base weight adjusted by that amount, giving the total weight carried.
//
// A runner's placing is "-" (not a number) when they were scratched or
// didn't finish — this correctly comes out as position: null; the caller
// (scrape.mjs) is responsible for not writing a race_results row in that
// case, since the database requires a position.

// Tote prices live in the first plain `.r-bets` block of each runner:
//   <div class="r-bets"><span class="priceAmount show"><span>Win:</span> 370</span>
//                       <span class="priceAmount show"><span>Place:</span> 200</span></div>
// (the second `.r-bets.betting-buttons` block just repeats them as buttons).
// Anything that isn't a plain number ("-", blank, "SCR") comes back null.
function parseOdds($, $el) {
  let win = null, place = null;
  $el.find(".r-bets:not(.betting-buttons) .priceAmount").each((_, node) => {
    const $n = $(node);
    const label = $n.children("span").first().text().trim().toLowerCase(); // "win:" / "place:"
    const value = $n.clone().children().remove().end().text().trim();      // text outside the label span
    if (!/^\d+(\.\d+)?$/.test(value)) return;
    if (label.startsWith("win")) win = value;
    else if (label.startsWith("place")) place = value;
  });
  return { win, place };
}

export function parseRacePage(html) {
  const $ = cheerio.load(html);

  const headerText = $(".box-out .one-line-only").first().text().trim(); // "Race 7 : 4.05"
  const headerMatch = headerText.match(/Race\s+(\d+)\s*:\s*([\d.]+)/);
  const raceNo = headerMatch ? Number(headerMatch[1]) : null;
  const timeOfDay = headerMatch ? headerMatch[2] : null;

  const name = $(".racecard-name").first().text().trim() || null;
  const distance = $(".racecard-distance").first().text().trim() || null;

  const list = $("ol.racecard");
  const isResult = (list.attr("class") || "").includes("result") || $(".r-placing").length > 0;

  const entries = [];
  $("li.runner").each((_, el) => {
    const $el = $(el);

    const placingText = $el.find(".r-placing").text().trim(); // "1st", "7th", or "-"
    const posMatch = placingText.match(/(\d+)/);
    const position = posMatch ? Number(posMatch[1]) : null;

    const gateText = $el.find(".r-number").first().text().trim();
    const gate = gateText ? Number(gateText) : null;

    const horseLink = $el.find(".r-name a").first();
    const horseName = horseLink.text().trim() || null;
    const horseHref = horseLink.attr("href") || "";
    const horseSlug = horseHref.replace("/horse/", "") || null;

    const statsText = $el.find(".r-stats").text().trim(); // "Age 7 | 60.5kg" or "Age 7 | 52+1kg"
    const ageMatch = statsText.match(/Age\s+(\d+)/);
    const age = ageMatch ? Number(ageMatch[1]) : null;
    const weightMatch = statsText.match(/([\d.]+)([+-][\d.]+)?\s*kg/);
    const weight = weightMatch
      ? parseFloat(weightMatch[1]) + (weightMatch[2] ? parseFloat(weightMatch[2]) : 0)
      : null;

    const timeText = $el.find(".r-time").text().trim(); // "1:23:98s" or "-s"
    const finishTime = /^\d/.test(timeText) ? timeText.replace(/s$/, "") : null;

    const jockey = $el.find(".r-jockey").text().trim() || null;
    const trainer = $el.find(".r-trainer").text().trim() || null;

    // The real silk artwork for this runner, e.g.
    // "https://supertote.sgp1.digitaloceanspaces.com/silks/2026-469368-1-1.png".
    // Linked to directly rather than re-hosted — see the migration for why.
    const silkUrl = $el.find("object.silk").attr("data") || null;

    // Tote prices, gear letters (e.g. S, B, T) and the "tipped" flag —
    // Supertote marks its favourite pick with a `tipped` class on the <li>.
    const { win: winOdds, place: placeOdds } = parseOdds($, $el);
    const gearItems = $el.find(".r-gear .gear-item").map((_, g) => $(g).text().trim()).get().filter(Boolean);
    const gear = gearItems.length ? gearItems.join(",") : null;
    const isTipped = $el.hasClass("tipped");

    entries.push({ position, gate, horseName, horseSlug, age, weight, finishTime, jockey, trainer, silkUrl, winOdds, placeOdds, gear, isTipped });
  });

  // Racing notes block: an <h4>Racing Notes</h4>, one or more <p> of analysis
  // (French), then an <h4>Danger : Horse Name</h4>.
  const notesBlock = $(".racing-notes").first();
  const racingNotes = notesBlock.find("p").map((_, p) => $(p).text().trim()).get().filter(Boolean).join("\n\n") || null;
  let dangerHorse = null;
  notesBlock.find("h4").each((_, h) => {
    const m = $(h).text().trim().match(/^Danger\s*:\s*(.+)$/i);
    if (m) dangerHorse = m[1].trim();
  });

  return { raceNo, timeOfDay, name, distance, isResult, entries, racingNotes, dangerHorse };
}
