"use client";

import { useT } from "@/components/LanguageProvider";
import { useNow } from "@/lib/useNow";
import { getRacePhase, minutesToOff, type RacePhase } from "@/lib/raceState";

type Props = {
  raceDate: string;
  raceTime: string;
  status: string;
  serverNow: number;
  className?: string;
};

/** LIVE / UPCOMING / OFF IN n MIN / RESULT PENDING / FINISHED — recalculated on the
 *  visitor's clock, so a race flips to LIVE at the off without any page refresh. */
export default function RacePhaseBadge({ raceDate, raceTime, status, serverNow, className = "" }: Props) {
  const { t } = useT();
  const now = useNow(serverNow, 5000);
  const race = { race_date: raceDate, race_time: raceTime, status };
  const phase: RacePhase = getRacePhase(race, now);

  const label =
    phase === "live" ? t("LIVE")
    : phase === "soon" ? t("Off in {n} min", { n: minutesToOff(race, now) })
    : phase === "awaiting" ? t("Result pending")
    : phase === "finished" ? t("Finished")
    : phase === "unresulted" ? t("No result")
    : t("Upcoming");

  return (
    <span className={`phase-pill phase-${phase} ${className}`}>
      {phase === "live" && <span className="live-dot" aria-hidden="true" />}
      {label}
    </span>
  );
}
