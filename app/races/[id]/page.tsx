import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Video, Search, Star, AlertTriangle, NotebookPen, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getRaceById, getEntriesForRace, getResultsForRace, getRacesForDate } from "@/lib/races";
import { getRecentFormForHorses } from "@/lib/horses";
import { getMeetingInfo } from "@/lib/meetings";
import { toPodiumRow } from "@/lib/raceDay";
import { fmtMoney } from "@/lib/format";
import { fmtDateLong, ordinal } from "@/lib/i18n";
import { fmtTime, getRacePhase, raceStartMs, refreshIntervalSec } from "@/lib/raceState";
import { EntryRow, ResultRow } from "@/components/RunnerCard";
import MarketBoard from "@/components/MarketBoard";
import PredictionPanel from "@/components/PredictionPanel";
import { getLatestModelRun, getPredictionsForRace } from "@/lib/predictions";
import RaceStrip from "@/components/RaceStrip";
import RacePhaseBadge from "@/components/RacePhaseBadge";
import RaceStateBanner from "@/components/RaceStateBanner";
import Countdown from "@/components/Countdown";
import LiveRefresh from "@/components/LiveRefresh";
import EmptyState from "@/components/EmptyState";
import { getFollowState } from "@/lib/follows";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { t, lang } = getT();
  const race = await getRaceById(params.id);
  if (!race) return { title: t("Race not found"), robots: { index: false } };
  const label = fmtDateLong(lang, race.race_date);
  const time = race.race_time ? race.race_time.slice(0, 5) : "";
  return pageMeta({
    title: `${race.name} — ${label}`,
    description: `${race.name}, ${label}${time ? ` ${time}` : ""}${race.distance ? ` · ${race.distance}` : ""} · Champ de Mars. ${race.status === "completed" ? t("Result, finishing order and dividends.") : t("Runners, jockeys, tote odds and odds movement.")}`,
    path: `/races/${race.id}`,
  });
}

export default async function RaceDetailPage({ params }: { params: { id: string } }) {
  const { t, lang } = getT();
  const race = await getRaceById(params.id);
  if (!race) return notFound();

  const nowMs = Date.now();
  const phase = getRacePhase(race, nowMs);

  const follow = await getFollowState();
  // The card (for race numbers, the strip and prev/next) and meeting info are extras: if they
  // fail the race itself still renders.
  const [entries, results, card, meeting, predictions, modelRun] = await Promise.all([
    race.status === "upcoming" ? getEntriesForRace(race.id) : Promise.resolve([]),
    race.status === "completed" ? getResultsForRace(race.id) : Promise.resolve([]),
    getRacesForDate(race.race_date).catch(() => [race]),
    getMeetingInfo(race.race_date).catch(() => null),
    race.status === "upcoming" ? getPredictionsForRace(race.id) : Promise.resolve([]),
    race.status === "upcoming" ? getLatestModelRun() : Promise.resolve(null),
  ]);

  const raceIndex = Math.max(0, card.findIndex((r) => r.id === race.id));
  const raceNo = raceIndex + 1;
  const prev = card[raceIndex - 1] ?? null;
  const next = card[raceIndex + 1] ?? null;
  const strip = card.map((r, i) => ({ id: r.id, no: i + 1, race_date: r.race_date, race_time: r.race_time, status: r.status }));

  // Recent form for the whole field in one lookup.
  const formByHorse =
    race.status === "upcoming"
      ? await getRecentFormForHorses(entries.filter((e) => e.horses).map((e) => e.horses!.id))
      : {};

  // Quietly keep the page current: fast around the off, slower earlier in the day; and while
  // a finished race is still waiting for its result rows.
  const msSinceOff = nowMs - raceStartMs(race);
  const waitingForResult = race.status === "completed" && results.length === 0 && msSinceOff < 6 * 3600000;
  const refreshSec = waitingForResult ? 30 : race.status === "upcoming" ? refreshIntervalSec([race], nowMs) : null;

  // Supertote's favourite pick(s) for the race — shown in the tips panel.
  const tipped = [
    ...entries.filter((e) => e.is_tipped).map((e) => ({ name: e.horses?.name ?? "Unknown", id: e.horses?.id ?? null, no: e.runner_no })),
    ...results.filter((r) => r.is_tipped).map((r) => ({ name: r.horses?.name ?? "Unknown", id: r.horses?.id ?? null, no: r.runner_no })),
  ];
  // Notes are published in French. English readers get the stored translation
  // (horse/jockey/trainer names protected at scrape time); if there isn't one
  // yet, the original is shown rather than nothing.
  const notesText = lang === "en" ? race.racing_notes_en || race.racing_notes : race.racing_notes;
  const hasTips = tipped.length > 0 || !!notesText || !!race.danger_horse;

  const prizePanel = race.prize_split && race.prize_split.length > 0 ? (
    <div className="panel mt-6">
      <h2 className="font-display text-xl">{t("Prize money")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        {race.prize_split.map((amount, i) => (
          <div key={i} className="stat-cell !text-left border border-line rounded-xl">
            <div className="stat-label !text-left">{ordinal(lang, i + 1)}</div>
            <div className="font-semibold tabular-nums mt-0.5">{fmtMoney(amount, lang)}</div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const timeFactors = entries.filter((e) => e.tf_fastest || e.tf_best3);

  const tipsPanel = hasTips ? (
    <div className="panel fade-in mt-6">
      <h2 className="font-display text-xl flex items-center gap-2"><NotebookPen size={18} /> {t("Race tips & racing notes")}</h2>
      <div className="mt-3 space-y-3 text-sm">
        {tipped.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill pill-gold inline-flex items-center gap-1"><Star size={11} fill="currentColor" /> {t("Tip")}</span>
            {tipped.map((tp, i) => (
              <span key={i} className="font-semibold">
                {tp.no != null && <span className="opacity-70 font-normal">{t("No.")} {tp.no} · </span>}
                {tp.id ? <Link href={`/horses/${tp.id}`} className="hover:underline">{tp.name}</Link> : tp.name}
              </span>
            ))}
          </div>
        )}
        {notesText && (
          <div className="space-y-2 leading-relaxed">
            {notesText.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
        )}
        {race.danger_horse && (
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-600 shrink-0" />
            <span><span className="font-semibold">{t("Danger")}:</span> {race.danger_horse}</span>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const podium = results.slice(0, 3).map(toPodiumRow);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <RacePhaseBadge raceDate={race.race_date} raceTime={race.race_time} status={race.status} serverNow={nowMs} />
            <span className="text-xs font-semibold text-gold2">
              {t("Race {n} of {total}", { n: raceNo, total: card.length })} · {race.course}
            </span>
          </div>
          <h1 className="text-3xl font-display mt-1.5">{race.name}</h1>
          <div className="text-white/70 text-sm mt-2">
            {fmtDateLong(lang, race.race_date)} · <span className="font-semibold text-white/90">{fmtTime(race.race_time)}</span> · {race.distance} · {fmtMoney(race.prize, lang)}
            {race.conditions ? ` · ${race.conditions}` : ""}
          </div>
          {(race.race_class || race.rails || meeting?.track_condition || meeting?.weather) && (
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {race.race_class && <span className="rounded-full bg-white/10 px-3 py-1">{t("Class")} {race.race_class}</span>}
              {race.rails && <span className="rounded-full bg-white/10 px-3 py-1">{t("Rails")}: {race.rails}</span>}
              {meeting?.track_condition && <span className="rounded-full bg-white/10 px-3 py-1">{t("Track condition")}: {meeting.track_condition}</span>}
              {meeting?.weather && <span className="rounded-full bg-white/10 px-3 py-1">{meeting.weather}</span>}
            </div>
          )}
          {(phase === "upcoming" || phase === "soon") && (
            <Countdown target={`${race.race_date}T${race.race_time}`} serverNow={nowMs} variant="hero" />
          )}
          {refreshSec && (
            <div className="mt-4"><LiveRefresh intervalSec={refreshSec} className="on-dark" /></div>
          )}
        </div>
      </div>

      <RaceStrip races={strip} serverNow={nowMs} currentId={race.id} sticky />

      <section className="py-6 md:py-10">
        <div className="wrap">
          <div className="flex flex-wrap gap-4 justify-between items-center mb-5">
            <Link href="/race-days" className="inline-block text-sm border-b border-ink pb-1">← {t("All race days")}</Link>
            <Link href={`/race-days/${race.race_date}`} className="inline-block text-sm border-b border-ink pb-1">{t("View full race day")} →</Link>
          </div>

          <RaceStateBanner raceDate={race.race_date} raceTime={race.race_time} status={race.status} serverNow={nowMs} />

          {race.status === "completed" ? (
            <div className="mt-6">
              {results.length === 0 ? (
                <EmptyState
                  icon={<Clock size={22} />}
                  title={waitingForResult ? t("Result pending") : t("No result available")}
                  hint={waitingForResult ? t("The official result will appear here automatically as soon as it is published.") : t("No result has been entered for this race yet.")}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <h2 className="font-display text-xl">{t("Official result")}</h2>
                    {podium[0]?.time && <span className="text-xs opacity-70">{t("Winning time")} <span className="font-mono font-semibold">{podium[0].time}</span></span>}
                  </div>
                  <div className="space-y-3">
                    {results.map((row, i) => (
                      <ResultRow
                        key={row.id}
                        index={i}
                        jockeyId={row.jockeys?.id ?? null}
                        number={row.runner_no}
                        horse={row.horses}
                        jockeyName={row.jockeys?.name ?? row.jockey}
                        weight={row.weight_kg}
                        position={row.position}
                        finishTime={row.finish_time}
                        margin={row.margin}
                        gate={row.gate}
                        winOdds={row.win_odds}
                        placeOdds={row.place_odds}
                        gear={row.gear}
                        isTipped={row.is_tipped}
                        rating={row.rating}
                        hwt={row.hwt}
                        hwtLast={row.hwt_last}
                        equip={row.equip}
                        gearChanged={row.gear_changed}
                        gearPrev={row.gear_prev}
                        performanceRating={row.performance_rating}
                        racePrize={race.prize}
                        prizeSplit={race.prize_split}
                      />
                    ))}
                  </div>
                </>
              )}

              {tipsPanel}
              {prizePanel}

              <div className="panel mt-6">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Video size={15} /> {t("Replay video")}</h3>
                {race.youtube_video_id ? (
                  <div className="mt-2.5 aspect-video rounded-2xl overflow-hidden">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${race.youtube_video_id}`}
                      title={`${race.name} — ${t("Replay video")}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="h-[120px] mt-2.5 bg-gradient-to-br from-turf to-turf2 rounded-2xl flex flex-col items-center justify-center text-white/75 text-center px-4 gap-2">
                    <span className="text-xs">{t("No replay linked yet")}</span>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${race.name} ${race.race_date} Champ de Mars`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill pill-gold flex items-center gap-1.5"
                    >
                      <Search size={11} /> {t("Search YouTube")}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              {entries.length === 0 ? (
                <EmptyState
                  icon={<Clock size={22} />}
                  title={t("Entries haven't been declared for this race yet.")}
                  hint={t("Runners and prices appear here automatically once the field is declared.")}
                />
              ) : (
                <>
                  {tipsPanel}

                  <div className="flex items-center justify-between flex-wrap gap-2 mt-8 mb-4">
                    <h2 className="font-display text-xl">{t("Runners")}</h2>
                    <span className="odds-legend" aria-label={t("Odds movement")}>
                      <span className="odds-move is-up"><ArrowUp size={10} strokeWidth={3} /></span> {t("Drifting")}
                      <span className="odds-move is-down ml-2"><ArrowDown size={10} strokeWidth={3} /></span> {t("Firming")}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {entries.map((e, i) => (
                      <EntryRow
                        key={e.id}
                        index={i}
                        jockeyId={e.jockeys?.id ?? null}
                        number={e.runner_no}
                        horse={e.horses}
                        jockeyName={e.jockeys?.name ?? null}
                        weight={e.weight_kg}
                        gate={e.gate}
                        odds={e.odds}
                        placeOdds={e.place_odds}
                        gear={e.gear}
                        isTipped={e.is_tipped}
                        oddsPrev={e.odds_prev}
                        placeOddsPrev={e.place_odds_prev}
                        oddsOpen={e.odds_open}
                        placeOddsOpen={e.place_odds_open}
                        oddsChangedAt={e.odds_changed_at}
                        rating={e.rating}
                        hwt={e.hwt}
                        hwtLast={e.hwt_last}
                        equip={e.equip}
                        gearChanged={e.gear_changed}
                        gearPrev={e.gear_prev}
                        form={e.horses ? formByHorse[e.horses.id] : undefined}
                        daysSince={e.tf_days_since}
                        follow={e.horses ? { signedIn: follow.signedIn, following: follow.ids.has(e.horses.id) } : undefined}
                      />
                    ))}
                  </div>

                  <MarketBoard entries={entries} />

                  <PredictionPanel entries={entries} predictions={predictions} run={modelRun} />
                </>
              )}

              {timeFactors.length > 0 && (
                <div className="panel mt-8">
                  <h2 className="font-display text-xl">{t("Time factors")}</h2>
                  <div className="overflow-x-auto mt-3">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t("No.")}</th><th>{t("Horse")}</th><th>{t("Fastest time")}</th><th>{t("Days since")}</th><th>{t("Best (last 3 starts)")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeFactors.map((e) => (
                          <tr key={e.id}>
                            <td>{e.runner_no ?? "—"}</td>
                            <td data-title>{e.horses?.name ?? t("Unknown")}</td>
                            <td data-label={t("Fastest time")} className="tabular-nums">{e.tf_fastest ?? "—"}</td>
                            <td data-label={t("Days since")}>{e.tf_days_since ?? "—"}</td>
                            <td data-label={t("Best (last 3 starts)")} className="tabular-nums">{e.tf_best3 ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {prizePanel}
            </div>
          )}

          {(prev || next) && (
            <nav aria-label={t("Previous and next race")} className="race-pager mt-10">
              {prev ? (
                <Link href={`/races/${prev.id}`} className="race-pager-link">
                  <ChevronLeft size={18} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[0.65rem] font-semibold opacity-65 tracking-wide">{t("Race {n}", { n: raceNo - 1 })} · {fmtTime(prev.race_time)}</span>
                    <span className="block text-sm font-semibold truncate">{prev.name}</span>
                  </span>
                </Link>
              ) : <span />}
              {next ? (
                <Link href={`/races/${next.id}`} className="race-pager-link is-next">
                  <span className="min-w-0 text-right">
                    <span className="block text-[0.65rem] font-semibold opacity-65 tracking-wide">{t("Race {n}", { n: raceNo + 1 })} · {fmtTime(next.race_time)}</span>
                    <span className="block text-sm font-semibold truncate">{next.name}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              ) : <span />}
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
