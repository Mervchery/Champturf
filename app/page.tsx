import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Play, Newspaper, CalendarDays, Flag } from "lucide-react";
import RaceSpotlight from "@/components/RaceSpotlight";
import RaceStrip from "@/components/RaceStrip";
import LiveRefresh from "@/components/LiveRefresh";
import EmptyState from "@/components/EmptyState";
import { ResultCard } from "@/components/Podium";
import { getHorses } from "@/lib/horses";
import { getJockeys } from "@/lib/jockeys";
import { getNews } from "@/lib/news";
import { getRaceDays } from "@/lib/meetings";
import { fmtMoney } from "@/lib/format";
import { fmtDateLong } from "@/lib/i18n";
import { getCurrentMeetingDate, getLatestResults, getMeetingBoard, toSpotRace, type BoardRace, type ResultRace } from "@/lib/raceDay";
import { mauritiusDate, pickBoardState, refreshIntervalSec } from "@/lib/raceState";

/** Secondary sections must never take the whole homepage down. */
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export default async function HomePage() {
  const { t, lang } = getT();
  const nowMs = Date.now();

  const meetingDate = await safe(getCurrentMeetingDate(nowMs), null);
  const [board, latest, horses, jockeys, news, raceDays] = await Promise.all([
    meetingDate ? safe(getMeetingBoard(meetingDate), [] as BoardRace[]) : Promise.resolve([] as BoardRace[]),
    safe(getLatestResults(6), [] as ResultRace[]),
    safe(getHorses(), []),
    safe(getJockeys(), []),
    safe(getNews(), []),
    safe(getRaceDays(), []),
  ]);

  const open = board.filter((b) => b.race.status !== "completed");
  const refreshSec = refreshIntervalSec(open.map((b) => b.race), nowMs);
  const today = mauritiusDate(nowMs);
  // The race the visitor most wants: the one running now, else the next to go, else one awaiting its result.
  const board_ = pickBoardState(open.map((b) => b.race), nowMs);
  const focusRace = board_.live[0] ?? board_.next ?? board_.awaiting[0] ?? open[0]?.race ?? null;
  const strip = board.map((b) => ({ id: b.race.id, no: b.no, race_date: b.race.race_date, race_time: b.race.race_time, status: b.race.status }));

  const topHorses = [...horses].sort((a, b) => b.wins - a.wins).slice(0, 5);
  const topJockeys = [...jockeys].filter((j) => !j.apprentice).sort((a, b) => b.wins - a.wins).slice(0, 5);
  const upcomingDays = raceDays
    .filter((d) => d.status !== "completed" && d.race_date !== meetingDate)
    .sort((a, b) => a.race_date.localeCompare(b.race_date))
    .slice(0, 4);

  return (
    <div>
      {/* HERO — the race card comes first on a phone, beside the headline on a desktop */}
      <section className="relative overflow-hidden bg-gradient-to-b from-turf to-turf2 text-surface py-8 md:py-20">
        <div className="wrap grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-10 items-center">
          <div className="order-2 md:order-1">
            <span className="text-xs font-semibold text-gold2 block mb-2.5">{t("CHAMP DE MARS · PORT LOUIS")}</span>
            <h1 className="font-display text-3xl sm:text-4xl md:text-6xl leading-[1.04]">
              {t("The pulse of")} <em className="italic text-gold2">{t("Mauritian")}</em>
              <br />
              {t("turf racing.")}
            </h1>
            <p className="mt-3 md:mt-4 text-sm md:text-base text-white/80 max-w-[46ch] leading-relaxed">
              {t("Live results, full pedigree records, and race-day coverage for every meeting on the island — built for owners, trainers, and fans who follow the form.")}
            </p>
            <div className="flex gap-3 mt-5 md:mt-7 flex-wrap">
              <Link href="/live" className="btn btn-gold"><Play size={15} /> {t("Watch live")}</Link>
              <Link href={focusRace ? `/races/${focusRace.id}` : meetingDate ? `/race-days/${meetingDate}` : "/race-days"} className="btn btn-ghost">{focusRace ? t("Race card") : meetingDate ? t("Today's race card") : t("Race calendar")}</Link>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <RaceSpotlight races={open.map(toSpotRace)} serverNow={nowMs} variant="hero" />
            {refreshSec && <div className="mt-3"><LiveRefresh intervalSec={refreshSec} className="on-dark" /></div>}
          </div>
        </div>
      </section>

      {/* THE CARD — every race of the current meeting at a glance */}
      {strip.length > 0 && (
        <section className="pt-6 md:pt-8">
          <div className="wrap">
            <div className="flex justify-between items-end mb-2.5 gap-3 flex-wrap">
              <h2 className="font-display text-xl">
                {meetingDate === today ? t("Today's races") : fmtDateLong(lang, meetingDate!)}
              </h2>
              <Link href={`/race-days/${meetingDate}`} className="inline-block text-sm border-b border-ink pb-1">{t("Open race day")} →</Link>
            </div>
            <RaceStrip races={strip} serverNow={nowMs} />
          </div>
        </section>
      )}

      {/* LATEST RESULTS */}
      <section className="py-8 md:py-14">
        <div className="wrap">
          <div className="flex justify-between items-end mb-5 md:mb-7 flex-wrap gap-3">
            <h2 className="font-display text-2xl md:text-3xl">{t("Latest results")}</h2>
            <Link href="/results" className="inline-block text-sm border-b border-ink pb-1">{t("Full results centre")} →</Link>
          </div>
          {latest.length === 0 ? (
            <EmptyState icon={<Flag size={22} />} title={t("No results yet.")} hint={t("Results appear here as soon as each race is official.")} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {latest.map((r, i) => (
                <div key={r.id} className={i >= 3 ? "hidden md:block" : undefined}>
                  <ResultCard race={r} showDate />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* LEADERBOARDS */}
      <section className="py-8 md:py-14 bg-parchment2">
        <div className="wrap grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          <div>
            <div className="flex justify-between items-end mb-4">
              <h2 className="font-display text-xl">{t("Leading horses")}</h2>
              <Link href="/stats" className="inline-block text-sm border-b border-ink pb-1">{t("Statistics centre")} →</Link>
            </div>
            <div className="panel">
              {topHorses.length === 0 && <p className="text-sm opacity-70">{t("No horses yet.")}</p>}
              {topHorses.map((h, i) => (
                <Link key={h.id} href={`/horses/${h.id}`} className="grid grid-cols-[32px_1fr_auto] gap-3.5 items-center py-3 border-b border-line last:border-0">
                  <div className="font-mono text-sm text-coral-ink font-semibold">{i + 1}</div>
                  <div>
                    <div className="font-semibold text-sm">{h.name}</div>
                    <div className="text-xs opacity-70">{h.trainer?.name ?? t("Unknown")}</div>
                  </div>
                  <div className="font-mono font-semibold text-right">{h.wins}{t("W")}</div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-end mb-4">
              <h2 className="font-display text-xl">{t("Leading jockeys")}</h2>
              <Link href="/stats" className="inline-block text-sm border-b border-ink pb-1">{t("Statistics centre")} →</Link>
            </div>
            <div className="panel">
              {topJockeys.length === 0 && <p className="text-sm opacity-70">{t("No jockeys yet.")}</p>}
              {topJockeys.map((j, i) => (
                <Link key={j.id} href={`/jockeys/${j.id}`} className="grid grid-cols-[32px_1fr_auto] gap-3.5 items-center py-3 border-b border-line last:border-0">
                  <div className="font-mono text-sm text-coral-ink font-semibold">{i + 1}</div>
                  <div>
                    <div className="font-semibold text-sm">{j.name}</div>
                    <div className="text-xs opacity-70">{j.nationality ? t("nat:" + j.nationality) : t("N/A")}</div>
                  </div>
                  <div className="font-mono font-semibold text-right">{j.wins}{t("W")}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* UPCOMING MEETINGS */}
      <section className="py-8 md:py-14">
        <div className="wrap">
          <div className="flex justify-between items-end mb-5 md:mb-7 flex-wrap gap-3">
            <h2 className="font-display text-2xl md:text-3xl">{t("Upcoming race days")}</h2>
            <Link href="/race-days" className="inline-block text-sm border-b border-ink pb-1">{t("See calendar")} →</Link>
          </div>
          {upcomingDays.length === 0 ? (
            <p className="text-sm opacity-70">{meetingDate ? t("No further race days scheduled yet.") : t("No upcoming races scheduled.")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {upcomingDays.map((d) => (
                <Link key={d.race_date} href={`/race-days/${d.race_date}`} className="card p-4">
                  <span className="pill pill-gold inline-flex items-center gap-1"><CalendarDays size={12} /> {t("Upcoming")}</span>
                  <h3 className="mt-2 text-sm font-semibold">{fmtDateLong(lang, d.race_date)}</h3>
                  <div className="text-xs opacity-70 mt-1">{t(d.raceCount === 1 ? "{n} race" : "{n} races", { n: d.raceCount })} · {fmtMoney(d.totalPrize, lang)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* NEWS */}
      <section className="pb-10 md:pb-14">
        <div className="wrap">
          <div className="flex justify-between items-end mb-5 md:mb-7 flex-wrap gap-3">
            <h2 className="font-display text-2xl md:text-3xl">{t("Latest news")}</h2>
            <Link href="/news" className="inline-block text-sm border-b border-ink pb-1">{t("All news")} →</Link>
          </div>
          {news.length === 0 ? (
            <p className="text-sm opacity-70">{t("No news yet.")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {news.slice(0, 3).map((n) => (
                <div key={n.id} className="card">
                  <div className="h-[120px] md:h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/75">
                    <Newspaper size={28} />
                  </div>
                  <div className="p-4">
                    <span className="pill">{t(n.category)}</span>
                    <h3 className="mt-2 font-semibold">{n.title}</h3>
                    <div className="text-xs opacity-70 mt-2">{n.article_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
