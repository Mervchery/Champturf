"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { useNow } from "@/lib/useNow";
import { fmtTime, getRacePhase, pickBoardState } from "@/lib/raceState";

export type StripRace = {
  id: string;
  no: number;
  race_date: string;
  race_time: string;
  status: string;
};

type Props = {
  races: StripRace[];
  serverNow: number;
  /** The race being viewed (race page) — highlighted and scrolled into view. */
  currentId?: string;
  /** "page": chips open /races/[id].  "anchor": chips jump to #race-N on the same page. */
  mode?: "page" | "anchor";
  /** Make the strip stick under the header while scrolling. */
  sticky?: boolean;
};

/** One chip per race on the card — R1 … Rn — with a status dot that updates on its own.
 *  The next race to go is outlined so it is findable at a glance. */
export default function RaceStrip({ races, serverNow, currentId, mode = "page", sticky = false }: Props) {
  const { t } = useT();
  const now = useNow(serverNow, 10000);
  const scroller = useRef<HTMLDivElement>(null);
  const nextId = pickBoardState(races, now).next?.id ?? null;
  const focusId = currentId ?? nextId;

  // Bring the relevant chip into view inside the strip only (never scrolls the page).
  useEffect(() => {
    const box = scroller.current;
    if (!box || !focusId) return;
    const el = box.querySelector<HTMLElement>(`[data-race="${focusId}"]`);
    if (el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "auto" });
  }, [focusId]);

  if (races.length === 0) return null;

  return (
    <nav
      aria-label={t("Races on this card")}
      className={sticky ? "race-strip is-sticky" : "race-strip"}
    >
      <div ref={scroller} className="race-strip-scroll no-scrollbar">
        {races.map((r) => {
          const phase = getRacePhase(r, now);
          const classes = [
            "race-chip",
            `phase-${phase}`,
            r.id === currentId ? "is-current" : "",
            r.id === nextId ? "is-next" : "",
          ].join(" ");
          const inner = (
            <>
              <span className="race-chip-no">
                {phase === "live" ? <span className="live-dot" aria-hidden="true" /> : phase === "finished" ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : null}
                R{r.no}
              </span>
              <span className="race-chip-time">{fmtTime(r.race_time)}</span>
            </>
          );
          return mode === "anchor" ? (
            <a key={r.id} data-race={r.id} href={`#race-${r.no}`} className={classes}>{inner}</a>
          ) : (
            <Link key={r.id} data-race={r.id} href={`/races/${r.id}`} className={classes} aria-current={r.id === currentId ? "page" : undefined}>{inner}</Link>
          );
        })}
      </div>
    </nav>
  );
}
