import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { Money } from "@/components/Money";
import {
  getChampionships, CHAMP_YEAR, RED_STAR_PRIZES, RED_STAR_RACES, TRIPLE_CROWN_BONUS,
  type ChampKey, type Row, type TrackedRace, type SpecialKey,
} from "@/lib/championships";

const CHAMPS: { key: ChampKey; title: string; objective: string; rule: string }[] = [
  { key: "horse", title: "Overall Horse", objective: "The horse with the highest total stakes earnings of the racing season.", rule: "Ranked by total stakes money won." },
  { key: "stable", title: "Overall Stable", objective: "The most successful stable of the racing season.", rule: "Ranked by the total stakes money won by the stable's horses." },
  { key: "jockey", title: "Overall Jockey", objective: "The most successful jockey of the racing season.", rule: "Ranked by wins. Ties are broken by second places, then third, fourth and subsequent places." },
  { key: "mauritian", title: "RED STAR Mauritian Jockeys", objective: "The best Mauritian jockey or apprentice jockey in the designated championship races.", rule: "Points: 1st 7, 2nd 3, 3rd 2, 4th 1. Points accumulate through the championship." },
  { key: "sprinters", title: "Sprinters", objective: "The best sprinting horse across the designated championship races.", rule: "Points: 1st 7, 2nd 3, 3rd 2, 4th 1, accumulated across the four qualifying races." },
  { key: "milers", title: "Milers", objective: "The best horse over the designated middle-distance races.", rule: "Points: 1st 7, 2nd 3, 3rd 2, 4th 1, accumulated across the four qualifying races." },
  { key: "stayers", title: "Stayers", objective: "The best staying horse across the designated longer-distance races.", rule: "Points: 1st 7, 2nd 3, 3rd 2, 4th 1, accumulated across the four qualifying races." },
  { key: "fouryo", title: "Four-Year-Old — Triple Crown", objective: "The best four-year-old horses in the Aqua Springs Million Rupee Triple Crown.", rule: "Points: 1st 7, 2nd 3, 3rd 2, 4th 1, accumulated across the three legs. The bonus needs a win in all three." },
  { key: "threeyo", title: "Three-Year-Old", objective: "The best three-year-old horses in the designated championship races.", rule: "Points: 1st 7, 2nd 3, 3rd 2, 4th 1, accumulated across the two designated races." },
];
const titleOf = (k: string) => CHAMPS.find((c) => c.key === k)?.title ?? k;
const SPECIAL = new Set<ChampKey>(["sprinters", "milers", "stayers", "fouryo", "threeyo"]);

export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({
    title: `${t("MTCJC Championships")} ${CHAMP_YEAR}`,
    description: t("Live standings for the MTCJC championships: horses, stables, jockeys, sprinters, milers, stayers and the Triple Crown."),
    path: "/championships",
  });
}

export default async function ChampionshipsPage({ searchParams }: { searchParams: { c?: string } }) {
  const { t, lang } = getT();
  const data = await getChampionships();
  const isTracker = searchParams.c === "tracker";
  const current = CHAMPS.find((c) => c.key === searchParams.c) ?? null;
  const sum = data.trackerSummary;

  const ord = (p: number | null | undefined) => {
    if (!p) return "–";
    if (lang === "fr") return p === 1 ? "1er" : `${p}e`;
    const s = p % 100 >= 11 && p % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[p % 10] ?? "th";
    return `${p}${s}`;
  };
  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric" });

  const rowsOf = (key: ChampKey): Row[] => (SPECIAL.has(key) ? data.specials[key as SpecialKey].rows : (data as any)[key]);
  const leaderLine = (key: ChampKey) => {
    const lead = rowsOf(key)[0];
    if (!lead) return null;
    if (key === "horse" || key === "stable") return { name: lead.name, stat: <Money amount={lead.amount} /> };
    if (key === "jockey") return { name: lead.name, stat: `${lead.wins} ${t("wins")}` };
    return { name: lead.name, stat: `${lead.points} ${t("pts")}` };
  };

  const raceStatus = (r: TrackedRace) => {
    switch (r.state) {
      case "counted": return { label: t("Counted"), cls: "pill-gold" };
      case "pending": return { label: t("Run — result pending"), cls: "pill-coral" };
      case "missing": return { label: t("Run — not in data yet"), cls: "pill-coral" };
      case "today": return { label: t("Racing today"), cls: "pill-coral" };
      default: return { label: r.daysTo === 1 ? t("Tomorrow") : t("In {n} days", { n: r.daysTo }), cls: "pill-outline" };
    }
  };

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("MTCJC")} {CHAMP_YEAR}</span>
          <h1 className="text-3xl font-display mt-1">{t("Championships")}</h1>
          <p className="mt-2 text-sm opacity-80 max-w-2xl">{t("Season rankings and special championships are separate competitions. Standings update as official results are published.")}</p>
        </div>
      </div>
      <section className="py-10 md:py-14">
        <div className="wrap">
          <div className="flex gap-1 border-b border-line mb-7 overflow-x-auto">
            <Link href="/championships" className={`pb-2.5 pr-5 text-sm whitespace-nowrap border-b-2 ${!current && !isTracker ? "border-coral font-semibold" : "border-transparent opacity-70"}`}>{t("Overview")}</Link>
            <Link href="/championships?c=tracker" className={`pb-2.5 pr-5 text-sm whitespace-nowrap border-b-2 ${isTracker ? "border-coral font-semibold" : "border-transparent opacity-70"}`}>{t("Race tracker")}</Link>
            {CHAMPS.map((c) => (
              <Link key={c.key} href={`/championships?c=${c.key}`} className={`pb-2.5 pr-5 text-sm whitespace-nowrap border-b-2 ${current?.key === c.key ? "border-coral font-semibold" : "border-transparent opacity-70"}`}>
                {t(c.title)}
              </Link>
            ))}
          </div>

          {!data.available && <div className="panel p-6 text-sm opacity-80">{t("Championship standings are not available right now. Please try again shortly.")}</div>}

          {data.available && !current && !isTracker && (
            <div className="space-y-5">
            <Link href="/championships?c=tracker" className="panel p-4 flex flex-wrap items-center gap-x-4 gap-y-1 hover:border-gold transition-colors">
              <span className="text-xs font-semibold text-gold2 uppercase tracking-wide">{t("Race tracker")}</span>
              <span className="text-sm flex-1 min-w-[12rem]">
                {t("{done} of {total} qualifying races counted", { done: sum.counted, total: sum.total })}
                {sum.pending + sum.missing > 0 && <span className="text-coral-ink font-semibold"> · {t("{n} run, awaiting result", { n: sum.pending + sum.missing })}</span>}
              </span>
              {sum.next && <span className="text-sm opacity-80">{t("Next")}: <b>{sum.next.name}</b> · {fmtDate(sum.next.date)}</span>}
            </Link>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CHAMPS.map((c) => {
                const lead = leaderLine(c.key);
                return (
                  <Link key={c.key} href={`/championships?c=${c.key}`} className="panel p-5 block hover:border-gold transition-colors">
                    <div className="text-xs font-semibold text-gold2 uppercase tracking-wide">{SPECIAL.has(c.key) ? t("Special championship") : t("Season ranking")}</div>
                    <h2 className="text-lg font-display mt-1">{t(c.title)}</h2>
                    <div className="mt-3 text-sm">
                      {lead ? (<><div className="text-xs opacity-60">{t("Leader")}</div><div className="font-semibold">{lead.name}</div><div className="opacity-80">{lead.stat}</div></>) : <span className="opacity-60">{t("No results yet")}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
            </div>
          )}

          {data.available && isTracker && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display">{t("Race tracker")}</h2>
                <p className="text-sm opacity-80 mt-1">{t("Every designated championship race, in date order — what has run, what has been counted and what is still to come.")}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[[sum.counted, t("Counted")], [sum.pending + sum.missing, t("Run, awaiting result")], [sum.upcoming, t("Still to run")], [sum.total, t("Qualifying races")]].map(([n, l]) => (
                  <div key={String(l)} className="stat-tile"><div className="v">{n}</div><div className="text-xs opacity-70 mt-1">{l}</div></div>
                ))}
              </div>
              <div className="h-2 rounded-full bg-parchment2 overflow-hidden" role="img" aria-label={t("{done} of {total} qualifying races counted", { done: sum.counted, total: sum.total })}>
                <div className="h-full bg-gold" style={{ width: `${(sum.counted / Math.max(1, sum.total)) * 100}%` }} />
              </div>
              <div className="panel !p-0">
                <ul className="divide-y divide-line">
                  {data.tracker.map((r) => {
                    const s = raceStatus(r);
                    return (
                      <li key={`${r.champ}-${r.idx}`} className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="w-28 opacity-70">{fmtDate(r.date)}</span>
                          <span className="font-semibold flex-1 min-w-[10rem]">
                            {r.unnamed ? `${t(r.name)} (${t("name to be confirmed")})` : r.name}
                            <Link href={`/championships?c=${r.champ === "fouryo" ? "fouryo" : r.champ}`} className="ml-2 text-xs font-normal opacity-60 underline underline-offset-2">{t(titleOf(r.champ))}</Link>
                          </span>
                          {r.winner && <span className="opacity-80">{t("Winner")}: {r.winner}</span>}
                          {r.moved && <span className="pill pill-outline">{t("Date moved")}</span>}
                          <span className={`pill ${s.cls}`}>{s.label}</span>
                        </div>
                        {r.moved && <p className="text-xs opacity-60 mt-1">{t("Originally scheduled for {d}.", { d: fmtDate(r.originalDate) })}</p>}
                        {r.matched && r.matched.confidence !== "exact" && (
                          <p className="text-xs opacity-60 mt-1">{t("Linked to")} “{r.matched.name}” ({fmtDate(r.matched.date)}){r.matched.note ? ` — ${r.matched.note}` : ""}</p>
                        )}
                        {(r.state === "pending" || r.state === "missing") && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer opacity-70">{t("Data check")}</summary>
                            <div className="mt-2 opacity-80 space-y-1">
                              <p>{r.state === "pending" ? t("The race is in the database, but no finishing order has been published yet. It will be scored automatically once results are in.") : t("No race matching this name was found around this date. It may have been postponed: set its new date in DATE_CHANGES, or if it ran under another name link it with RACE_OVERRIDES (both in lib/championships.ts).")}</p>
                              {r.candidates.length > 0 && (
                                <ul className="space-y-0.5">
                                  {r.candidates.map((c) => (<li key={c.id} className="!p-0 !border-0 !text-xs !block opacity-80">{fmtDate(c.date)} · {c.name} · {c.status} · {c.results} {t("results")} · <code>{c.id}</code></li>))}
                                </ul>
                              )}
                            </div>
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="text-xs opacity-60">{t("Races are linked to the results by name and date, and follow a race even if its date has moved. A race counts as soon as its finishing order is published.")}</p>
            </div>
          )}

          {data.available && current && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display">{t(current.title)}</h2>
                <p className="text-sm opacity-80 mt-1">{t(current.objective)}</p>
                <p className="text-xs opacity-60 mt-1">{t("Ranking criterion")}: {t(current.rule)}</p>
              </div>

              {current.key === "mauritian" && (
                <div className="panel p-4 text-sm">
                  <div className="font-semibold mb-2">{t("Prize money")}</div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {[t("Champion"), t("Runner-up"), t("Third place")].map((l, i) => (<span key={l}>{l}: <b><Money amount={RED_STAR_PRIZES[i]} /></b></span>))}
                  </div>
                  {!RED_STAR_RACES && <p className="text-xs opacity-60 mt-2">{t("The designated races are not listed in the rules, so every race of the season currently counts.")}</p>}
                </div>
              )}

              {current.key === "fouryo" && (
                <div className="panel p-4 text-sm">
                  <div className="font-semibold">{t("Triple Crown bonus")}: <Money amount={data.tripleCrown.bonus} /></div>
                  {data.tripleCrown.winner ? (
                    <p className="mt-1">{t("Won by")} <b>{data.tripleCrown.winner.name}</b> — {t("the owners receive the bonus.")}</p>
                  ) : data.tripleCrown.rolledOver ? (
                    <p className="mt-1">{t("No horse won all three legs. The bonus rolls over to {year} and rises to Rs {amount}.", { year: CHAMP_YEAR + 1, amount: TRIPLE_CROWN_BONUS[CHAMP_YEAR + 1].toLocaleString(dateLocale(lang)) })}</p>
                  ) : data.tripleCrown.legsRun > 0 && data.tripleCrown.alive.length > 0 ? (
                    <p className="mt-1">{t("Still on course after {n} of 3 legs:", { n: data.tripleCrown.legsRun })} <b>{data.tripleCrown.alive.map((r) => r.name).join(", ")}</b></p>
                  ) : (
                    <p className="mt-1 opacity-70">{t("A horse must win all three legs. Leading the points does not qualify for the bonus.")}</p>
                  )}
                  <p className="text-xs opacity-60 mt-2">{t("If unclaimed, the bonus rises to Rs 2,000,000 in 2027 and Rs 3,000,000 in 2028.")}</p>
                </div>
              )}

              {SPECIAL.has(current.key) && (() => {
                const o = data.specials[current.key as SpecialKey].outlook;
                const lead = data.specials[current.key as SpecialKey].rows[0];
                return (
                  <div className="panel p-4 text-sm">
                    <div className="font-semibold mb-1">{t("Title outlook")}</div>
                    {!lead ? <p className="opacity-70">{t("No results yet")}</p> : o.clinched ? (
                      <p><b>{lead.name}</b> {t("has clinched the championship — no rival can catch them with the races left.")}</p>
                    ) : (
                      <p>
                        {t("{n} race(s) left, worth up to {pts} points.", { n: o.toCome + o.uncounted, pts: o.maxAvailable })}{" "}
                        {t("{lead} leads by {gap} points; {c} horse(s) can still catch the leader.", { lead: lead.name, gap: o.leaderGap ?? 0, c: o.contenders })}
                      </p>
                    )}
                  </div>
                );
              })()}

              {SPECIAL.has(current.key) && (
                <div className="panel">
                  <div className="p-4 pb-2 text-sm font-semibold">{t("Qualifying races")}</div>
                  <ul className="divide-y divide-line">
                    {data.specials[current.key as SpecialKey].races.map((r, i) => {
                      const s = raceStatus(r);
                      const tbc = !!r.unnamed;
                      return (
                        <li key={i} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="w-28 opacity-70">{fmtDate(r.date)}</span>
                          <span className="font-semibold flex-1 min-w-[10rem]">
                            {r.leg ? `${r.leg}. ` : ""}{tbc ? `${t(r.name)} (${t("name to be confirmed")})` : r.name}
                            {r.distance && <span className="font-normal opacity-60"> · {r.distance} · {r.grade}</span>}
                          </span>
                          {r.winner && <span className="opacity-80">{t("Winner")}: {r.winner}</span>}
                          {r.moved && <span className="pill pill-outline">{t("Moved from {d}", { d: fmtDate(r.originalDate) })}</span>}
                          <span className={`pill ${s.cls}`}>{s.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="panel">
                {rowsOf(current.key).length === 0 ? (
                  <div className="p-6 text-sm opacity-70">{t("No results yet")}</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{current.key === "stable" ? t("Stable") : current.key === "horse" || SPECIAL.has(current.key) ? t("Horse") : t("Jockey")}</th>
                        {(current.key === "horse" || SPECIAL.has(current.key)) && <th>{t("Stable")}</th>}
                        {SPECIAL.has(current.key) && data.specials[current.key as SpecialKey].races.map((r, i) => <th key={i}>{current.key === "fouryo" ? `L${r.leg}` : r.name.replace(/ Cup| Trophy/g, "")}</th>)}
                        {!SPECIAL.has(current.key) && <th>{t("Runs")}</th>}
                        <th>{t("Wins")}</th>
                        {(current.key === "jockey" || current.key === "mauritian") && <><th>{t("2nd")}</th><th>{t("3rd")}</th></>}
                        {(current.key === "horse" || current.key === "stable") && <th>{t("Stakes")}</th>}
                        {(SPECIAL.has(current.key) || current.key === "mauritian") && <th>{t("Points")}</th>}
                        {current.key === "mauritian" && <th>{t("Prize")}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rowsOf(current.key).map((r, i) => (
                        <tr key={r.id}>
                          <td>{i + 1}</td>
                          <td data-title>{r.name}{r.sub === "Apprentice" && <span className="ml-2 text-xs opacity-60">{t("Apprentice")}</span>}</td>
                          {(current.key === "horse" || SPECIAL.has(current.key)) && <td data-label={t("Stable")}>{r.sub ?? "—"}</td>}
                          {SPECIAL.has(current.key) && data.specials[current.key as SpecialKey].races.map((rc, k) => <td key={k} data-label={current.key === "fouryo" ? `L${rc.leg}` : rc.name}>{ord(r.cells?.[k])}</td>)}
                          {!SPECIAL.has(current.key) && <td data-label={t("Runs")}>{r.rides}</td>}
                          <td data-label={t("Wins")}>{r.wins}</td>
                          {(current.key === "jockey" || current.key === "mauritian") && <><td data-label={t("2nd")}>{r.seconds}</td><td data-label={t("3rd")}>{r.thirds}</td></>}
                          {(current.key === "horse" || current.key === "stable") && <td data-label={t("Stakes")}><Money amount={r.amount} /></td>}
                          {(SPECIAL.has(current.key) || current.key === "mauritian") && <td data-label={t("Points")}><b>{r.points}</b></td>}
                          {current.key === "mauritian" && <td data-label={t("Prize")}>{i < 3 ? <Money amount={RED_STAR_PRIZES[i]} /> : "—"}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <p className="text-xs opacity-60">
                {current.key === "horse" || current.key === "stable"
                  ? t("Stakes money comes from each race's published prize split where available, otherwise an estimate of 60% / 20% / 10% of the purse to the first three.")
                  : SPECIAL.has(current.key) || current.key === "mauritian"
                    ? t("Ties on points are separated provisionally by wins, then second and third places. Tie-breaks, disqualifications, non-runners and withdrawals follow the official MTCJC regulations.")
                    : t("Standings are updated after confirmed race results are published.")}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
