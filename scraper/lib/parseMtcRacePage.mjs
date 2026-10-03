import * as cheerio from "cheerio";

// Parser for a Mauritius Turf Club Jockey Club race-card page
// (mtcjockeyclub.com → Race → a race). Everything is read from the server-rendered
// HTML — the live odds on that page are loaded by script afterwards and are
// deliberately NOT used (Supertote's tote prices are the source for those).
//
// Returns, per race:
//   raceNo, name, distance, startTime, raceClass, date (YYYY-MM-DD),
//   rails, stakeMoney, prizeSplit[] (1st..4th), tabLinks[],
//   runners[]: { tab, horseName, rating, hwt, hwtLast, equip, gearChanged,
//                gearPrev, timeFactors{fastest, daysSince, best3} }

const clean = (s) => (s ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const toInt = (s) => {
  const m = clean(s).replace(/,/g, "").match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
};

/** Text of an element without its hover-tooltip children. */
function plainText($, el) {
  const c = $(el).clone();
  c.find(".gear-tooltip").remove();
  return clean(c.text());
}

/** "Last Run HWT: 508" style lines inside a .gear-tooltip → { "last run hwt": "508", ... } */
function tooltipPairs($, el) {
  const out = {};
  $(el).find(".gear-tooltip > div").each((_, d) => {
    const label = clean($(d).find("strong").first().text()).replace(/:$/, "").toLowerCase();
    const value = clean($(d).clone().children("strong").remove().end().text());
    if (label) out[label] = value;
  });
  return out;
}

function headerValue($, label) {
  let value = null;
  $(".race-card-race-details .card-column").each((_, col) => {
    if (clean($(col).find(".card-header").first().text()).toLowerCase() === label.toLowerCase()) {
      value = clean($(col).find(".card-header-text").first().text());
    }
  });
  return value;
}

export function parseMtcRacePage(html) {
  const $ = cheerio.load(html);

  // ---- Race header -------------------------------------------------------
  const selectedTab = $("#tabs li.tab-selected .tab-label.hidden-xs").first().text() || $("#tabs li.tab-selected").first().text();
  const raceNo = toInt(selectedTab);
  const name = clean($(".race-card-race-details .race-name .card-header-text").first().text()) || null;
  const distance = headerValue($, "Distance");
  const raceClass = headerValue($, "Race Class");
  const startTime = headerValue($, "Start Time");

  // The page's own script declares the race date: var race_dt = '2026-10-04';
  const dateMatch = html.match(/race_dt\s*=\s*['"](\d{4}-\d{2}-\d{2})['"]/);
  const date = dateMatch ? dateMatch[1] : ($("#nextRaceDateHolder").attr("data-race-date") ?? "").slice(0, 10) || null;

  // "Rails: 2.25m (Pent: 2.8 normal at the time of declarations)"
  const rails = clean($(".meeting-rails span").map((_, e) => $(e).text()).get().join(" ")).replace(/^rails:\s*/i, "") || null;

  const stakeMoney = toInt(($(".stake-money").first().text().match(/Rs\s*([\d,]+)/i) ?? [])[1]);
  const prizeSplit = $(".fgr-rh-middle-pm").map((_, e) => toInt($(e).text())).get().filter((n) => n != null);

  // Other races of the same meeting (tabs: relative links like "R2")
  const tabLinks = $("#tabs li:not(.tab-selected) a").map((_, a) => clean($(a).attr("href"))).get().filter(Boolean);

  // ---- Runners (desktop table: silk | tab | horse | trainer/jockey | equip | hwt | bp | weight | rating | odds)
  const runners = [];
  $("table.race-card-mtc tbody tr.runner_row").each((_, row) => {
    const $row = $(row);
    if ($row.hasClass("strikeout")) return; // scratched
    const tds = $row.children("td");
    const horseName = clean($row.find(".horse-td a").first().text()) || clean($row.attr("data-name"));
    if (!horseName) return;

    // Equip: a plain code ("A", "XA", "NA" = none), or a changed-gear cell with a tooltip
    const $equip = tds.eq(4);
    const gearTips = tooltipPairs($, $equip);
    const gearChanged = "current gear" in gearTips;
    let equip = gearChanged ? gearTips["current gear"] : plainText($, $equip).replace(/\*/g, "").trim();
    // "NA" is the Jockey Club's own "no gear" — keep it so the site shows "—" rather than falling back to Supertote's letters.
    if (!equip) equip = null;
    const gearPrev = gearChanged ? gearTips["previous gear"] || null : null;

    // HWT: "507 (-1)" with a tooltip giving last-run and current weights
    const $hwt = tds.eq(5);
    const hwtTips = tooltipPairs($, $hwt);
    const hwt = toInt(hwtTips["current hwt"] ?? plainText($, $hwt));
    const hwtLast = toInt(hwtTips["last run hwt"]);

    runners.push({
      tab: toInt($row.attr("data-tab-no")),
      horseName,
      rating: toInt(tds.eq(8).text()),
      hwt, hwtLast,
      equip, gearChanged, gearPrev,
      timeFactors: null,
    });
  });

  // ---- Time Factors table (matched to runners by horse name) --------------
  const byName = new Map(runners.map((r) => [r.horseName.toLowerCase(), r]));
  $("h3").filter((_, h) => /time factors/i.test($(h).text())).first().nextAll("table").first().find("tbody tr").each((_, tr) => {
    const c = $(tr).children("td").map((_, td) => clean($(td).text())).get(); // [tab, horse, fastest, daysSince, best3]
    const r = byName.get((c[1] ?? "").toLowerCase());
    if (r) r.timeFactors = { fastest: c[2] || null, daysSince: c[3] || null, best3: c[4] || null };
  });

  return { raceNo, name, distance, raceClass, startTime, date, rails, stakeMoney, prizeSplit, tabLinks, runners };
}
