// Pure helpers for follower alerts — no database, no network — so they can be unit-tested.

export function parseOdds(value) {
  if (value == null) return null;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** A price move worth a notification: at least `minPct` (default 15%) AND at least 0.3 in absolute terms. */
export function oddsMove(prev, cur, minPct = 0.15) {
  const p = parseOdds(prev);
  const c = parseOdds(cur);
  if (p == null || c == null || p === c) return null;
  const change = Math.abs(c - p);
  if (change < 0.3 || change / p < minPct) return null;
  return { prev: p, cur: c, direction: c < p ? "firming" : "drifting" };
}

export function ordinalEn(n) {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}
export const ordinalFr = (n) => (n === 1 ? "1er" : `${n}e`);

/** "Sat 10 Oct" / "sam. 10 oct." from a YYYY-MM-DD date (race dates are calendar dates, no timezone). */
export function dateLabel(isoDate, lang) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

const hhmm = (t) => (t ? String(t).slice(0, 5) : "");
// Prices are shown x10 everywhere on the site (12 -> 120); alerts match. Move detection above stays on raw values.
const fmt = (n) => String(Math.round(Number(String(n).replace(",", ".")) * 10 * 100) / 100);

/** Build the {en, fr} title/body pair for one alert. */
export function buildMessage(kind, d) {
  const when = (lang) => [dateLabel(d.raceDate, lang), hhmm(d.raceTime)].filter(Boolean).join(" ");
  if (kind === "declared") {
    const extra = (lang) => [
      d.runnerNo != null ? (lang === "fr" ? `n° ${d.runnerNo}` : `No. ${d.runnerNo}`) : null,
      d.jockey ? (lang === "fr" ? `jockey ${d.jockey}` : `jockey ${d.jockey}`) : null,
      d.odds ? (lang === "fr" ? `cote ${fmt(d.odds)}` : `win ${fmt(d.odds)}`) : null,
    ].filter(Boolean);
    return {
      en: { title: `${d.horse} is declared to run`, body: [`${d.raceName}`, when("en"), ...extra("en")].join(" · ") },
      fr: { title: `${d.horse} est déclaré partant`, body: [`${d.raceName}`, when("fr"), ...extra("fr")].join(" · ") },
    };
  }
  if (kind === "odds") {
    const arrow = d.move.direction === "firming" ? "▼" : "▲";
    const price = `${fmt(d.move.prev)} → ${fmt(d.move.cur)}`;
    return {
      en: {
        title: `${d.horse} ${arrow} ${price}`,
        body: `Win price ${d.move.direction === "firming" ? "firming (shortening)" : "drifting (lengthening)"} · ${d.raceName} · ${when("en")}`,
      },
      fr: {
        title: `${d.horse} ${arrow} ${price}`,
        body: `Cote gagnant ${d.move.direction === "firming" ? "en baisse (se raccourcit)" : "en hausse (s'allonge)"} · ${d.raceName} · ${when("fr")}`,
      },
    };
  }
  // result
  return {
    en: { title: `${d.horse} finished ${ordinalEn(d.position)}`, body: [d.raceName, dateLabel(d.raceDate, "en"), d.jockey ? `jockey ${d.jockey}` : null].filter(Boolean).join(" · ") },
    fr: { title: `${d.horse} a terminé ${ordinalFr(d.position)}`, body: [d.raceName, dateLabel(d.raceDate, "fr"), d.jockey ? `jockey ${d.jockey}` : null].filter(Boolean).join(" · ") },
  };
}
