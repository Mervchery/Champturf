import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Video, Search, Star, AlertTriangle, NotebookPen, ArrowUp, ArrowDown } from "lucide-react";
import { getRaceById, getEntriesForRace, getResultsForRace } from "@/lib/races";
import { getRecentForm } from "@/lib/horses";
import { fmtMoney } from "@/lib/format";
import { fmtDateLong, ordinal } from "@/lib/i18n";
import { EntryRow, ResultRow } from "@/components/RunnerCard";

export const revalidate = 0;

export default async function RaceDetailPage({ params }: { params: { id: string } }) {
  const { t, lang } = getT();
  const race = await getRaceById(params.id);
  if (!race) return notFound();

  const [entries, results] = await Promise.all([
    race.status === "upcoming" ? getEntriesForRace(race.id) : Promise.resolve([]),
    race.status === "completed" ? getResultsForRace(race.id) : Promise.resolve([]),
  ]);

  // Recent form for upcoming entries, fetched per horse (small field size, cheap).
  const formByHorse: Record<string, string[]> = {};
  if (race.status === "upcoming") {
    await Promise.all(
      entries.filter((e) => e.horses).map(async (e) => {
        formByHorse[e.horses!.id] = await getRecentForm(e.horses!.id);
      })
    );
  }

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
    <div className="panel mt-8">
      <h3 className="font-display text-xl">{t("Prize money")}</h3>
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
    <div className="panel fade-in mt-8">
      <h3 className="font-display text-xl flex items-center gap-2"><NotebookPen size={18} /> {t("Race tips & racing notes")}</h3>
      <div className="mt-3 space-y-3 text-sm">
        {tipped.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill pill-gold inline-flex items-center gap-1"><Star size={11} fill="currentColor" /> {t("Tip")}</span>
            {tipped.map((tp, i) => (
              <span key={i} className="font-semibold">
                {tp.no != null && <span className="opacity-50 font-normal">{t("No.")} {tp.no} · </span>}
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

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{(race.status === "upcoming" ? t("UPCOMING") : t("COMPLETED"))} · {race.course}</span>
          <h1 className="text-3xl font-display mt-1">{race.name}</h1>
          <div className="text-white/70 text-sm mt-2">
            {fmtDateLong(lang, race.race_date)} · {race.race_time} · {race.distance} · {fmtMoney(race.prize, lang)}
            {race.conditions ? ` · ${race.conditions}` : ""}
          </div>
          {(race.race_class || race.rails) && (
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {race.race_class && <span className="rounded-full bg-white/10 px-3 py-1">{t("Class")} {race.race_class}</span>}
              {race.rails && <span className="rounded-full bg-white/10 px-3 py-1">{t("Rails")}: {race.rails}</span>}
            </div>
          )}
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <Link href="/race-days" className="text-sm border-b border-ink pb-0.5">← {t("All race days")}</Link>
            <Link href={`/race-days/${race.race_date}`} className="text-sm border-b border-ink pb-0.5">{t("View full race day")} →</Link>
          </div>

          {prizePanel}

          {tipsPanel}

          {race.status === "completed" ? (
            <div className="mt-8">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="font-display text-xl">{t("Official result")}</h3>
                {results.length > 0 && (
                  <span className="text-xs opacity-50 hidden sm:block">{t("Jockey · Trainer · No. · Weight · Win/Place")}</span>
                )}
              </div>
              {results.length === 0 ? (
                <p className="text-sm opacity-60">{t("No result has been entered for this race yet.")}</p>
              ) : (
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
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8">
                <div className="panel">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Camera size={15} /> {t("Photo finish gallery")}</h4>
                  <div className="h-[120px] mt-2.5 bg-gradient-to-br from-turf to-turf2 rounded-2xl flex items-center justify-center text-white/50">
                    {t("Image")}
                  </div>
                </div>
                <div className="panel">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Video size={15} /> {t("Replay video")}</h4>
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
                    <div className="h-[120px] mt-2.5 bg-gradient-to-br from-turf to-turf2 rounded-2xl flex flex-col items-center justify-center text-white/60 text-center px-4 gap-2">
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
            </div>
          ) : (
            <div className="mt-8">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="font-display text-xl">{t("Entries")}</h3>
                {entries.length > 0 && (
                  <span className="odds-legend" aria-label={t("Odds movement")}>
                    <span className="odds-move is-up"><ArrowUp size={10} strokeWidth={3} /></span> {t("Drifting")}
                    <span className="odds-move is-down ml-2"><ArrowDown size={10} strokeWidth={3} /></span> {t("Firming")}
                  </span>
                )}
              </div>
              {entries.length === 0 ? (
                <p className="text-sm opacity-60">{t("Entries haven't been declared for this race yet.")}</p>
              ) : (
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
                    />
                  ))}
                </div>
              )}
              {timeFactors.length > 0 && (
                <div className="panel mt-8">
                  <h3 className="font-display text-xl">{t("Time factors")}</h3>
                  <div className="overflow-x-auto mt-3">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("No.")}</th><th>{t("Horse")}</th><th>{t("Fastest time")}</th><th>{t("Days since")}</th><th>{t("Best (last 3 starts)")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeFactors.map((e) => (
                          <tr key={e.id}>
                            <td>{e.runner_no ?? "—"}</td>
                            <td>{e.horses?.name ?? t("Unknown")}</td>
                            <td className="tabular-nums">{e.tf_fastest ?? "—"}</td>
                            <td>{e.tf_days_since ?? "—"}</td>
                            <td className="tabular-nums">{e.tf_best3 ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
