"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, Play, Radio } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import Countdown from "@/components/Countdown";
import { useNow } from "@/lib/useNow";
import { fmtMoney } from "@/lib/format";
import { fmtDateLong } from "@/lib/i18n";
import { fmtOdds, fmtTime, getRacePhase, mauritiusDate, oddsDirection, pickBoardState } from "@/lib/raceState";

export type SpotRunner = { no: number | null; name: string; odds: string | null; oddsPrev: string | null };

export type SpotRace = {
  id: string;
  name: string;
  race_date: string;
  race_time: string;
  status: string;
  distance: string;
  prize: number;
  course: string;
  no: number;
  total: number;
  runnerCount: number;
  /** Market leaders, shortest price first. */
  runners: SpotRunner[];
};

type Props = {
  /** Every race of the meeting that is not completed yet (completed ones drop out on refresh). */
  races: SpotRace[];
  serverNow: number;
  /** "hero" = dark glass card for the home hero; "panel" = light card for other pages. */
  variant?: "hero" | "panel";
};

/** The headline "what's happening now" card: LIVE race if one is running, otherwise the NEXT
 *  race with its countdown and market leaders. It re-evaluates every few seconds on the
 *  visitor's clock, so it moves from next → live → next-race-after on its own. */
export default function RaceSpotlight({ races, serverNow, variant = "panel" }: Props) {
  const { t, lang } = useT();
  const now = useNow(serverNow, 5000);
  const hero = variant === "hero";

  const { live, next, awaiting } = pickBoardState(races, now);
  const focus = live[0] ?? next ?? null;

  const shell = hero
    ? "bg-white/[0.06] border border-white/15 rounded backdrop-blur-md p-5"
    : "panel";
  const muted = hero ? "text-white/75" : "opacity-70";
  const title = hero ? "text-white" : "";

  if (!focus) {
    const waiting = awaiting[0];
    return (
      <div className={shell}>
        <span className={`text-[0.7rem] font-semibold ${hero ? "text-gold2" : "opacity-70"}`}>
          {waiting ? t("RESULT PENDING") : t("NO UPCOMING RACE SCHEDULED")}
        </span>
        <p className={`text-sm mt-2 ${muted}`}>
          {waiting
            ? t("Race {n} has run — the official result will appear here automatically.", { n: waiting.no })
            : t("Check back soon for the next meeting. Meetings are normally held on Saturdays and Sundays.")}
        </p>
        {waiting && (
          <Link href={`/races/${waiting.id}`} className={`btn mt-4 ${hero ? "btn-gold" : "btn-dark"}`}>
            {t("Race card")} <ChevronRight size={15} />
          </Link>
        )}
      </div>
    );
  }

  const phase = getRacePhase(focus, now);
  const isLive = phase === "live";
  const sameDay = focus.race_date === mauritiusDate(now);
  const when = sameDay ? t("Today") : fmtDateLong(lang, focus.race_date);

  return (
    <div className={`${shell} ${isLive ? "spotlight-live" : ""}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-[0.7rem] font-semibold ${isLive ? "text-coral-ink" : hero ? "text-gold2" : "opacity-70"} ${isLive && hero ? "!text-white" : ""}`}>
          {isLive ? (
            <>
              <span className="live-dot" aria-hidden="true" />
              {t("LIVE NOW")}
            </>
          ) : (
            t("NEXT RACE")
          )}
        </span>
        <span className={`text-xs ${muted}`}>
          {when} · {t("Race {n} of {total}", { n: focus.no, total: focus.total })} · {fmtTime(focus.race_time)}
        </span>
      </div>

      <h2 className={`font-display text-2xl mt-2 ${title}`}>{focus.name}</h2>
      <div className={`text-sm mt-1.5 ${muted}`}>
        {focus.course} · {focus.distance} · {fmtMoney(focus.prize, lang)}
        {focus.runnerCount > 0 ? ` · ${t("{n} runners", { n: focus.runnerCount })}` : ""}
      </div>

      {isLive ? (
        <div className={`mt-4 rounded-xl p-3.5 ${hero ? "bg-white/10" : "bg-parchment2"}`}>
          <div className="flex items-center gap-2 font-semibold text-sm"><Radio size={15} className="animate-pulse" /> {t("The race is off")}</div>
          <p className={`text-xs mt-1 ${muted}`}>{t("The official result will appear here automatically.")}</p>
        </div>
      ) : hero ? (
        <Countdown target={`${focus.race_date}T${focus.race_time}`} serverNow={serverNow} variant="hero" />
      ) : (
        <div className="mt-3 flex items-baseline gap-2 text-sm">
          <span className="opacity-70">{t("Off in")}</span>
          <span className="text-xl"><Countdown target={`${focus.race_date}T${focus.race_time}`} serverNow={serverNow} variant="compact" /></span>
        </div>
      )}

      {!isLive && focus.runners.length > 0 && (
        <div className="mt-4">
          <div className={`text-[0.65rem] font-semibold tracking-wide ${muted}`}>{t("MARKET LEADERS")}</div>
          <ul className="mt-1.5 space-y-1.5">
            {focus.runners.map((r, i) => {
              const dir = oddsDirection(r.odds, r.oddsPrev);
              return (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <span className={`spot-no ${hero ? "is-hero" : ""}`}>{r.no ?? "–"}</span>
                  <span className={`flex-1 min-w-0 truncate font-medium ${title}`}>{r.name}</span>
                  {dir && (dir === "down"
                    ? <ArrowDown size={12} strokeWidth={3} className="text-emerald-500 shrink-0" aria-label={t("Firming")} />
                    : <ArrowUp size={12} strokeWidth={3} className="text-red-500 shrink-0" aria-label={t("Drifting")} />)}
                  <span className={`font-mono font-semibold tabular-nums ${hero ? "text-gold2" : ""}`}>{fmtOdds(r.odds)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 mt-5">
        <Link href={`/races/${focus.id}`} className={`btn ${hero ? "btn-gold" : "btn-dark"}`}>
          {isLive ? t("Follow the race") : t("Race card")} <ChevronRight size={15} />
        </Link>
        {isLive ? (
          <Link href="/live" className={`btn ${hero ? "btn-ghost" : "btn-outline"}`}><Play size={14} /> {t("Watch live")}</Link>
        ) : (
          <Link href={`/race-days/${focus.race_date}`} className={`btn ${hero ? "btn-ghost" : "btn-outline"}`}>{t("Whole meeting")}</Link>
        )}
      </div>

      {awaiting.length > 0 && (
        <Link href={`/races/${awaiting[0].id}`} className={`block mt-3.5 text-xs underline-offset-2 hover:underline ${muted}`}>
          {t("Race {n} has run — result pending", { n: awaiting[0].no })} →
        </Link>
      )}
    </div>
  );
}
