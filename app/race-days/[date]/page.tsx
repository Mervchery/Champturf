import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Trophy } from "lucide-react";
import { getMeetingInfo } from "@/lib/meetings";
import { getRacesForDate, pickFeaturedRace } from "@/lib/races";
import { getMeetingBoard } from "@/lib/raceDay";
import { Money } from "@/components/Money";
import { fmtDateLong } from "@/lib/i18n";
import { fmtTime, isCancelled, oddsDirection, refreshIntervalSec } from "@/lib/raceState";
import { fmtOddsS } from "@/lib/oddsServer";
import { PodiumList } from "@/components/Podium";
import RaceStrip from "@/components/RaceStrip";
import RacePhaseBadge from "@/components/RacePhaseBadge";
import LiveRefresh from "@/components/LiveRefresh";
import WeatherCard, { WeatherIcon } from "@/components/WeatherCard";
import { getRaceDayForecast } from "@/lib/weather";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export async function generateMetadata({ params }: { params: { date: string } }): Promise<Metadata> {
  const { t, lang } = getT();
  const races = await getRacesForDate(params.date);
  if (races.length === 0) return { title: t("Race day not found"), robots: { index: false } };
  const label = fmtDateLong(lang, params.date);
  const done = races.every((r) => r.status === "completed");
  return pageMeta({
    title: `${t("Race day")} ${label} — Champ de Mars`,
    description: `${races.length} ${t("races")} · ${label}. ${done ? t("Full results and dividends.") : t("Race cards, runners and live odds movement.")}`,
    path: `/race-days/${params.date}`,
  });
}

export default async function RaceDayPage({ params }: { params: { date: string } }) {
  const { t, lang } = getT();
  const nowMs = Date.now();
  const [board, meeting, forecast] = await Promise.all([
    getMeetingBoard(params.date),
    getMeetingInfo(params.date).catch(() => null),
    getRaceDayForecast(params.date),
  ]);

  if (board.length === 0) return notFound();

  const races = board.map((b) => b.race);
  const totalPrize = races.reduce((sum, r) => sum + (r.prize ?? 0), 0);
  const dateLabel = fmtDateLong(lang, params.date);
  // Race 6 of the day is the local "feature race" convention (see pickFeaturedRace).
  const featuredId = pickFeaturedRace(races)?.id ?? null;
  // Races that never got a result are cancelled: not "open", and not counted as races to be run.
  const cancelledIds = new Set(board.filter((b) => b.race.status !== "completed" && isCancelled(b.race, nowMs)).map((b) => b.race.id));
  const open = board.filter((b) => b.race.status !== "completed" && !cancelledIds.has(b.race.id));
  const finishedCount = board.length - open.length - cancelledIds.size;
  const refreshSec = refreshIntervalSec(races, nowMs);
  const strip = board.map((b) => ({ id: b.race.id, no: b.no, race_date: b.race.race_date, race_time: b.race.race_time, status: b.race.status }));

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("RACE DAY")}</span>
          <h1 className="text-3xl font-display mt-1">{dateLabel}</h1>
          <div className="text-white/70 text-sm mt-2">
            {meeting?.course ?? races[0].course} · {t("{done} of {total} races run", { done: finishedCount, total: board.length - cancelledIds.size })}{cancelledIds.size > 0 ? ` · ${cancelledIds.size} ${t("Cancelled").toLowerCase()}` : ""}
          </div>
          {refreshSec && <div className="mt-4"><LiveRefresh intervalSec={refreshSec} className="on-dark" /></div>}
        </div>
      </div>

      <RaceStrip races={strip} serverNow={nowMs} sticky />

      <section className="py-6 md:py-10">
        <div className="wrap">
          <Link href="/race-days" className="inline-block text-sm border-b border-ink pb-1">← {t("All race days")}</Link>

          <div className="mt-5">
            {open.length === 0 && (
              <div className="panel flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-gold2 flex items-center justify-center shrink-0"><Trophy size={20} className="text-ink" /></div>
                <div className="min-w-0">
                  <div className="font-semibold">{t("This meeting is complete")}</div>
                  <Link href="/results" className="text-sm underline underline-offset-2">{t("Full results centre")} →</Link>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 mb-8">
            <div className="stat-tile"><div className="v">{races.length}</div><div className="l">{t("Races")}</div></div>
            <div className="stat-tile"><div className="v !text-xl"><Money amount={totalPrize} /></div><div className="l">{t("Stakes money")}</div></div>
            <div className="stat-tile"><div className="v !text-xl">{meeting?.weather ?? (forecast ? <span className="inline-flex items-center gap-1.5"><WeatherIcon kind={forecast.kind} size={20} />{forecast.high}°</span> : t("N/A"))}</div><div className="l">{meeting?.weather || !forecast ? t("Weather") : t("Forecast")}</div></div>
            <div className="stat-tile"><div className="v !text-xl">{meeting?.track_condition ?? t("N/A")}</div><div className="l">{t("Track condition")}</div></div>
          </div>

          {forecast && (
            <div className="mb-8">
              <WeatherCard forecast={forecast} raceHours={races.map((r) => Number(String(r.race_time).slice(0, 2)))} />
            </div>
          )}

          <h2 className="font-display text-2xl mb-4">{t("Races on this card")}</h2>
          <div className="space-y-4">
            {board.map((b) => (
              <article key={b.race.id} id={`race-${b.no}`} className="meeting-race">
                <Link href={`/races/${b.race.id}`} className="meeting-race-head">
                  <div className="meeting-race-no" aria-hidden="true">R{b.no}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{fmtTime(b.race.race_time)}</span>
                      <RacePhaseBadge raceDate={b.race.race_date} raceTime={b.race.race_time} status={b.race.status} serverNow={nowMs} />
                      {b.race.id === featuredId && <span className="pill pill-gold !text-[0.6rem]">{t("Feature race")}</span>}
                    </div>
                    <h3 className="font-display text-lg leading-snug mt-1">{b.race.name}</h3>
                    <div className="text-xs opacity-70 mt-0.5">
                      {b.race.distance}
                      {b.race.race_class ? ` · ${t("Class")} ${b.race.race_class}` : ""} · <Money amount={b.race.prize} />
                      {b.runnerCount > 0 ? ` · ${t("{n} runners", { n: b.runnerCount })}` : ""}
                    </div>
                  </div>
                  <ChevronRight size={18} className="opacity-50 shrink-0" aria-hidden="true" />
                </Link>

                {cancelledIds.has(b.race.id) ? (
                  <p className="meeting-race-note">{t("Cancelled")}</p>
                ) : b.race.status === "completed" ? (
                  b.podium.length > 0 ? (
                    <PodiumList rows={b.podium} />
                  ) : (
                    <p className="meeting-race-note">{t("Result not entered yet.")}</p>
                  )
                ) : b.market.length > 0 ? (
                  <div className="meeting-race-market">
                    <div className="text-[0.65rem] font-semibold tracking-wide opacity-65 mb-1.5">{t("MARKET LEADERS")}</div>
                    <ul className="space-y-1.5">
                      {b.market.map((m, i) => {
                        const dir = oddsDirection(m.odds, m.oddsPrev);
                        return (
                          <li key={i} className="flex items-center gap-2.5 text-sm">
                            <span className="spot-no">{m.no ?? "–"}</span>
                            {m.id ? <Link href={`/horses/${m.id}`} className="flex-1 min-w-0 truncate font-medium hover:underline">{m.name}</Link> : <span className="flex-1 min-w-0 truncate font-medium">{m.name}</span>}
                            {dir && (dir === "down"
                              ? <ArrowDown size={12} strokeWidth={3} className="text-emerald-600 shrink-0" aria-label={t("Firming")} />
                              : <ArrowUp size={12} strokeWidth={3} className="text-red-600 shrink-0" aria-label={t("Drifting")} />)}
                            <span className="font-mono font-semibold tabular-nums">{fmtOddsS(m.odds)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="meeting-race-note">
                    {b.runnerCount > 0 ? t("Prices not published yet.") : t("Runners not declared yet.")}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
