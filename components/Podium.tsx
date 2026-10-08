import Link from "next/link";
import SilkImage from "@/components/SilkImage";
import { getT } from "@/lib/i18n/server";
import { fmtDateLong, ordinal } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { fmtTime } from "@/lib/raceState";
import { JockeyCapIcon, BinocularsIcon } from "@/components/RacingIcons";
import { ChevronRight } from "lucide-react";
import type { PodiumRow, ResultRace } from "@/lib/raceDay";

function posClass(p: number) {
  return p === 1 ? "podium-1" : p === 2 ? "podium-2" : p === 3 ? "podium-3" : "";
}

/** 1st / 2nd / 3rd with silk, horse, jockey, trainer, starting price and (winner's) time. */
export function PodiumList({ rows, showTime = true }: { rows: PodiumRow[]; showTime?: boolean }) {
  const { t, lang } = getT();
  if (rows.length === 0) return null;
  return (
    <ol className="podium-list">
      {rows.map((p) => (
        <li key={p.position} className={`podium-row ${p.position === 1 ? "is-first" : ""}`}>
          <span className={`podium-pos ${posClass(p.position)}`} aria-label={ordinal(lang, p.position)}>{p.position}</span>
          <SilkImage url={p.silkUrl} title={p.horseName} size={34} fallback />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 min-w-0">
              {p.horseId ? (
                <Link href={`/horses/${p.horseId}`} className="font-semibold truncate hover:underline">{p.horseName}</Link>
              ) : (
                <span className="font-semibold truncate">{p.horseName}</span>
              )}
              {p.runnerNo != null && <span className="text-[0.7rem] opacity-60 tabular-nums shrink-0">#{p.runnerNo}</span>}
            </div>
            <div className="podium-people">
              <span className="inline-flex items-center gap-1 min-w-0">
                <JockeyCapIcon size={12} />
                <span className="truncate">
                  {p.jockeyName
                    ? p.jockeyId ? <Link href={`/jockeys/${p.jockeyId}`} className="hover:underline">{p.jockeyName}</Link> : p.jockeyName
                    : t("Unknown")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 min-w-0">
                <BinocularsIcon size={12} />
                <span className="truncate">
                  {p.trainerName
                    ? p.trainerId ? <Link href={`/trainers/${p.trainerId}`} className="hover:underline">{p.trainerName}</Link> : p.trainerName
                    : t("Unknown")}
                </span>
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono font-semibold tabular-nums leading-tight">{p.odds ?? "—"}</div>
            <div className="text-[0.68rem] opacity-60 leading-tight mt-0.5">
              {showTime && p.time ? <span className="font-mono">{p.time}</span> : p.odds ? t("SP") : ""}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A finished race as a card: header (race no., time, name, distance) over the podium. */
export function ResultCard({ race, showDate = false }: { race: ResultRace; showDate?: boolean }) {
  const { t, lang } = getT();
  return (
    <article className="result-card">
      <Link href={`/races/${race.id}`} className="result-card-head">
        <div className="min-w-0">
          <div className="text-[0.7rem] font-semibold opacity-70 tracking-wide">
            {showDate ? `${fmtDateLong(lang, race.race_date)} · ` : ""}
            {t("Race {n}", { n: race.no })} · {fmtTime(race.race_time)}
          </div>
          <h3 className="font-display text-lg leading-snug mt-0.5 truncate">{race.name}</h3>
          <div className="text-xs opacity-70 mt-0.5">
            {race.distance}
            {race.race_class ? ` · ${t("Class")} ${race.race_class}` : ""}
            {race.prize ? ` · ${fmtMoney(race.prize, lang)}` : ""}
            {race.runnerCount > 0 ? ` · ${t("{n} runners", { n: race.runnerCount })}` : ""}
          </div>
        </div>
        <ChevronRight size={18} className="opacity-50 shrink-0" aria-hidden="true" />
      </Link>
      {race.podium.length === 0 ? (
        <p className="text-sm opacity-70 px-4 pb-4">{t("No result entered yet.")}</p>
      ) : (
        <PodiumList rows={race.podium} />
      )}
      <Link href={`/races/${race.id}`} className="result-card-foot">{t("Full result")} →</Link>
    </article>
  );
}
