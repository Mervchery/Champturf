"use client";

import { Clock, Flag, Radio, TriangleAlert } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { useNow } from "@/lib/useNow";
import { getRacePhase } from "@/lib/raceState";

type Props = {
  raceDate: string;
  raceTime: string;
  status: string;
  serverNow: number;
};

/** The one-line "what is happening with this race right now" banner. Appears and changes
 *  on its own as the clock passes the off — no refresh needed. */
export default function RaceStateBanner({ raceDate, raceTime, status, serverNow }: Props) {
  const { t } = useT();
  const now = useNow(serverNow, 5000);
  const phase = getRacePhase({ race_date: raceDate, race_time: raceTime, status }, now);

  if (phase === "soon") {
    return (
      <div className="state-banner is-soon" role="status">
        <Flag size={16} aria-hidden="true" />
        <div><strong>{t("Going to post")}</strong> — {t("prices can move quickly now.")}</div>
      </div>
    );
  }
  if (phase === "live") {
    return (
      <div className="state-banner is-live" role="status">
        <Radio size={16} className="animate-pulse" aria-hidden="true" />
        <div><strong>{t("The race is off")}</strong> — {t("the result will appear here automatically.")}</div>
      </div>
    );
  }
  if (phase === "awaiting") {
    return (
      <div className="state-banner is-awaiting" role="status">
        <Clock size={16} aria-hidden="true" />
        <div><strong>{t("Result pending")}</strong> — {t("the race has run. The official result will appear here automatically.")}</div>
      </div>
    );
  }
  if (phase === "unresulted") {
    return (
      <div className="state-banner is-missing" role="status">
        <TriangleAlert size={16} aria-hidden="true" />
        <div>{t("No official result has been recorded for this race.")}</div>
      </div>
    );
  }
  return null;
}
