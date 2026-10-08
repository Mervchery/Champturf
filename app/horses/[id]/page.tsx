import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HorseIcon } from "@/components/RacingIcons";
import { getHorseById, getHorseProfileExtras, type HorseProfileExtras } from "@/lib/horses";
import { fmtDateLong } from "@/lib/i18n";
import { fmtTime, mauritiusDate, oddsDirection, refreshIntervalSec } from "@/lib/raceState";
import Countdown from "@/components/Countdown";
import LiveRefresh from "@/components/LiveRefresh";
import EmptyState from "@/components/EmptyState";
import { ArrowDown, ArrowUp, CalendarClock, History } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import SilkImage from "@/components/SilkImage";
import FollowButton from "@/components/FollowButton";
import { getFollowState } from "@/lib/follows";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { t } = getT();
  const h = await getHorseById(params.id);
  if (!h) return { title: t("Horse not found"), robots: { index: false } };
  const bits = [
    h.age ? `${h.age}yo` : null,
    h.sex ? t(h.sex) : null,
    h.trainer ? `${t("Trainer")}: ${h.trainer.name}` : null,
  ].filter(Boolean).join(" · ");
  return pageMeta({
    title: `${h.name} — ${t("Horse profile")}`,
    description: `${h.name}${bits ? ` (${bits})` : ""}. ${t("Wins")}: ${h.wins}, ${t("Starts")}: ${h.starts}. ${t("Form, race history and odds movement at Champ de Mars, Mauritius.")}`,
    path: `/horses/${h.id}`,
  });
}

export default async function HorseDetailPage({ params }: { params: { id: string } }) {
  const { t, lang } = getT();
  const h = await getHorseById(params.id);
  if (!h) return notFound();
  const nowMs = Date.now();
  const emptyExtras: HorseProfileExtras = {
    runs: [], next: null, lastRunDate: null, byDistance: [], byJockey: [],
    recorded: { starts: 0, wins: 0, places: 0, winPct: 0, placePct: 0, avgFinish: null },
  };
  // The extras (previous runs, next engagement, splits) are additions to the profile: if they
  // fail to load, the rest of the page still renders.
  const [extras, follow] = await Promise.all([
    getHorseProfileExtras(h.id, nowMs).catch(() => emptyExtras),
    getFollowState(),
  ]);
  const { runs, next, recorded, lastRunDate, byDistance, byJockey } = extras;
  const form = runs.slice(0, 5).map((f) => String(f.position));
  const daysSince = lastRunDate
    ? Math.max(0, Math.round((Date.parse(`${mauritiusDate(nowMs)}T00:00:00Z`) - Date.parse(`${lastRunDate}T00:00:00Z`)) / 86400000))
    : null;
  const usualJockey = byJockey[0] && byJockey[0].starts >= 2 ? byJockey[0] : null;
  const nextDir = next ? oddsDirection(next.odds, next.oddsPrev) : null;
  const refreshSec = next ? refreshIntervalSec([{ race_date: next.raceDate, race_time: next.raceTime, status: "upcoming" }], nowMs) : null;

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap flex gap-6 items-center flex-wrap">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-gold2 flex items-center justify-center text-gold2 shrink-0 overflow-hidden relative">
            {h.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.photo_url} alt={h.name} className="w-full h-full object-cover" />
            ) : (
              <HorseIcon size={40} />
            )}
            {h.silk_image_url && (
              <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 shadow-md">
                <SilkImage fallback url={h.silk_image_url} size={26} title={h.name} />
              </div>
            )}
          </div>
          <div>
            <span className="text-xs font-semibold text-gold2">{t("HORSE PROFILE")}</span>
            <h1 className="text-3xl font-display mt-1">{h.name}</h1>
            <div className="text-white/70 text-sm mt-1.5">
              {h.age ? t("{n}yo", { n: h.age }) : t("N/A")} {h.sex ? t(h.sex) : t("N/A")} · {h.breed ?? t("N/A")} · {h.color ? t(h.color) : t("N/A")} · {t("Born")} {h.origin ?? t("N/A")}
            </div>
            {h.rating != null && <span className="pill pill-gold mt-2 inline-block">{t("Rating")} {h.rating}</span>}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <FollowButton horseId={h.id} horseName={h.name} initialFollowing={follow.ids.has(h.id)} signedIn={follow.signedIn} />
              {refreshSec && <LiveRefresh intervalSec={refreshSec} className="on-dark" />}
            </div>
          </div>
        </div>
      </div>
      <section className="py-10 md:py-14">
        <div className="wrap">
          <Link href="/horses" className="inline-block text-sm border-b border-ink pb-1">← {t("Back to horses")}</Link>

          {next && (
            <div className="panel mt-6 border-l-4 !border-l-gold2">
              <div className="flex items-center gap-2 text-xs font-semibold opacity-70"><CalendarClock size={14} /> {t("NEXT RUN")}</div>
              <Link href={`/races/${next.raceId}`} className="block font-display text-lg mt-1 hover:underline">{next.raceName}</Link>
              <div className="text-xs opacity-70 mt-0.5">
                {fmtDateLong(lang, next.raceDate)} · {fmtTime(next.raceTime)}{next.distance ? ` · ${next.distance}` : ""}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div><div className="stat-label">{t("Off in")}</div><div className="font-semibold mt-0.5"><Countdown target={`${next.raceDate}T${next.raceTime}`} serverNow={nowMs} variant="compact" /></div></div>
                <div><div className="stat-label">{t("No.")}</div><div className="font-semibold mt-0.5">{next.runnerNo ?? t("N/A")}</div></div>
                <div>
                  <div className="stat-label">{t("Jockey")}</div>
                  <div className="font-semibold mt-0.5 truncate">
                    {next.jockeyName ? (next.jockeyId ? <Link href={`/jockeys/${next.jockeyId}`} className="hover:underline">{next.jockeyName}</Link> : next.jockeyName) : t("Unknown")}
                  </div>
                </div>
                <div>
                  <div className="stat-label">{t("Win")}</div>
                  <div className="font-mono font-bold mt-0.5 flex items-center gap-1.5">
                    {next.odds ?? "—"}
                    {nextDir && (nextDir === "down"
                      ? <ArrowDown size={13} strokeWidth={3} className="text-emerald-600" aria-label={t("Firming")} />
                      : <ArrowUp size={13} strokeWidth={3} className="text-red-600" aria-label={t("Drifting")} />)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <h2 className="font-display text-xl mt-7 mb-4">{t("Career record")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <div className="stat-tile"><div className="v">{h.wins}</div><div className="l">{t("Wins")}</div></div>
            <div className="stat-tile"><div className="v">{h.seconds + h.thirds}</div><div className="l">{t("Places")}</div></div>
            <div className="stat-tile"><div className="v">{h.starts}</div><div className="l">{t("Starts")}</div></div>
            <div className="stat-tile"><div className="v">{fmtMoney(h.earnings, lang)}</div><div className="l">{t("Career earnings")}</div></div>
          </div>
          {recorded.starts > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="stat-tile"><div className="v">{recorded.winPct}%</div><div className="l">{t("Win strike rate")}</div></div>
              <div className="stat-tile"><div className="v">{recorded.placePct}%</div><div className="l">{t("Place strike rate")}</div></div>
              <div className="stat-tile"><div className="v">{recorded.avgFinish ?? t("N/A")}</div><div className="l">{t("Average finish")}</div></div>
              <div className="stat-tile"><div className="v">{daysSince != null ? t("{n}d", { n: daysSince }) : t("N/A")}</div><div className="l">{t("Since last run")}</div></div>
            </div>
          )}
          <div className="mb-10" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <div className="panel min-w-0">
              <h3 className="text-sm font-semibold mb-3">{t("Connections")}</h3>
              <table className="kv">
                <tbody>
                  <tr><td>{t("Owner")}</td><td>{h.owner ? <Link href="/owners" className="font-semibold hover:underline">{h.owner.name}</Link> : t("Unknown")}</td></tr>
                  <tr><td>{t("Trainer")}</td><td>{h.trainer ? <Link href={`/trainers/${h.trainer.id}`} className="font-semibold hover:underline">{h.trainer.name}</Link> : t("Unknown")}</td></tr>
                  <tr><td>{t("Stable")}</td><td>{h.stable ? <Link href={`/stables/${h.stable.id}`} className="font-semibold hover:underline">{h.stable.name}</Link> : t("Unknown")}</td></tr>
                  {usualJockey && (
                    <tr><td>{t("Usual jockey")}</td><td>{usualJockey.id ? <Link href={`/jockeys/${usualJockey.id}`} className="font-semibold hover:underline">{usualJockey.label}</Link> : <span className="font-semibold">{usualJockey.label}</span>} <span className="opacity-60 text-xs">({usualJockey.wins}/{usualJockey.starts})</span></td></tr>
                  )}
                  <tr><td>{t("Medical status")}</td><td><span className="pill pill-gold">{h.medical_status ? t(h.medical_status) : t("N/A")}</span></td></tr>
                </tbody>
              </table>
            </div>
            <div className="panel">
              <h3 className="text-sm font-semibold mb-1">{t("Recent form")}</h3>
              <p className="text-[0.7rem] opacity-60 mb-3">{t("Finishing positions, latest run first")}</p>
              {form.length === 0 ? (
                <p className="text-sm opacity-70">{t("No results recorded for this horse yet.")}</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {form.map((f, i) => (
                    <span key={i} className={`form-pill is-lg ${f === "1" ? "is-win" : f === "2" || f === "3" ? "is-place" : ""}`}>{f}</span>
                  ))}
                </div>
              )}
              {(byDistance.length > 0 || byJockey.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  {byDistance.length > 0 && (
                    <div>
                      <div className="stat-label !text-left mb-1.5">{t("By distance")}</div>
                      <ul className="text-xs space-y-1">
                        {byDistance.map((d) => (
                          <li key={d.key} className="flex justify-between gap-3"><span className="font-semibold">{d.label}</span><span className="opacity-70 tabular-nums">{d.wins}{t("W")} · {d.places}{t("P")} / {d.starts}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {byJockey.length > 0 && (
                    <div>
                      <div className="stat-label !text-left mb-1.5">{t("By jockey")}</div>
                      <ul className="text-xs space-y-1">
                        {byJockey.map((j) => (
                          <li key={j.key} className="flex justify-between gap-3 min-w-0"><span className="font-semibold truncate">{j.label}</span><span className="opacity-70 tabular-nums shrink-0">{j.wins}{t("W")} · {j.places}{t("P")} / {j.starts}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <h2 className="font-display text-xl mb-4">{t("Previous runs")}</h2>
          {runs.length === 0 ? (
            <EmptyState icon={<History size={22} />} title={t("No races recorded for this horse yet.")} hint={t("Previous runs appear here after the horse's first recorded race.")} />
          ) : (
            <div className="panel !p-0 overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("Pos")}</th><th>{t("Race")}</th><th>{t("Date")}</th><th>{t("Distance")}</th><th>{t("Jockey")}</th><th>{t("Trainer")}</th><th>{t("SP")}</th><th>{t("Time")}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r, i) => (
                    <tr key={`${r.raceId}-${i}`}>
                      <td>
                        <span className={`pill ${r.position === 1 ? "pill-gold" : "pill-outline"}`}>
                          {r.position}{r.fieldSize ? <span className="opacity-60 font-normal">/{r.fieldSize}</span> : null}
                        </span>
                      </td>
                      <td data-title><Link href={`/races/${r.raceId}`} className="hover:underline">{r.raceName}</Link></td>
                      <td data-label={t("Date")} className="text-xs opacity-70">{r.raceDate}</td>
                      <td data-label={t("Distance")} className="text-xs">{r.distance ?? "—"}</td>
                      <td data-label={t("Jockey")} className="text-xs">{r.jockeyId ? <Link href={`/jockeys/${r.jockeyId}`} className="hover:underline">{r.jockeyName}</Link> : (r.jockeyName ?? "—")}</td>
                      <td data-label={t("Trainer")} className="text-xs">{r.trainerName ?? "—"}</td>
                      <td data-label={t("SP")} className="text-xs font-mono tabular-nums">{r.odds ?? "—"}</td>
                      <td data-label={t("Time")} className="text-xs font-mono">{r.time ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
