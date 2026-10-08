import Link from "next/link";
import SilkImage from "@/components/SilkImage";
import FollowButton from "@/components/FollowButton";
import { fmtMoney } from "@/lib/format";
import { ordinal } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { JockeyCapIcon, BinocularsIcon } from "@/components/RacingIcons";
import { ArrowDown, ArrowUp, Star } from "lucide-react";
import type { HorseSummary } from "@/lib/races";

function podiumClass(position: number | null) {
  if (position === 1) return "podium-1";
  if (position === 2) return "podium-2";
  if (position === 3) return "podium-3";
  return "";
}

function PrizeWon({ position, racePrize, prizeSplit }: { position: number; racePrize: number; prizeSplit?: number[] | null }) {
  const { lang } = getT();
  // The race's real purse split (from the Jockey Club card) when we have it…
  const real = prizeSplit?.[position - 1];
  if (real != null) return <>{fmtMoney(real, lang)}</>;
  // …otherwise the 60/20/10 estimate used for horse earnings — display only.
  const pct = position === 1 ? 0.6 : position === 2 ? 0.2 : position === 3 ? 0.1 : 0;
  if (pct === 0) return <span className="opacity-70">—</span>;
  return <>{fmtMoney(Math.round(racePrize * pct), lang)}</>;
}

type BaseProps = {
  // The racecard "No" — not the gate/barrier number.
  number: number | null;
  horse: HorseSummary | null;
  jockeyName: string | null;
  jockeyId?: string | null;
  weight: number | null;
  // Position in the list — only used to stagger the entrance animation.
  index?: number;
};

// Small career-record ring, inspired by the win/place donut on French
// racecard apps — gold arc for wins, outline arc for places (2nd+3rd),
// remaining track for everything else, with total starts in the middle.
function FormRing({ wins, places, starts }: { wins: number; places: number; starts: number }) {
  const size = 30, stroke = 3, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const winFrac = starts > 0 ? wins / starts : 0;
  const placeFrac = starts > 0 ? places / starts : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
        {starts > 0 && (
          <>
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gold-2, #c9a04d)" strokeWidth={stroke}
              strokeDasharray={`${winFrac * c} ${c}`} strokeLinecap="round"
            />
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gold-2, #c9a04d)" strokeOpacity={0.4} strokeWidth={stroke}
              strokeDasharray={`${placeFrac * c} ${c}`} strokeDashoffset={-winFrac * c} strokeLinecap="round"
            />
          </>
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[0.55rem] font-semibold tabular-nums">{starts}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
// Building blocks shared by EntryRow and ResultRow. The card is a header
// (number, silk, name) over a full-width body (people → stats → odds →
// form), so nothing is left floating in a narrow side column.
// ---------------------------------------------------------------------

function Person({ kind, name, href }: { kind: "Jockey" | "Trainer"; name: string | null | undefined; href?: string | null }) {
  const { t } = getT();
  const Icon = kind === "Jockey" ? JockeyCapIcon : BinocularsIcon;
  return (
    <div className="person">
      <span className="person-icon" aria-hidden="true"><Icon size={16} /></span>
      <span className="min-w-0">
        <span className="person-label">{t(kind)}</span>
        <span className="person-name">
          {name ? (href ? <Link href={href} className="hover:underline">{name}</Link> : name) : <span className="opacity-70">{t("Unknown")}</span>}
        </span>
      </span>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = getT();
  return (
    <div className="stat-cell">
      <div className="stat-label">{t(label)}</div>
      <div className="stat-value">{children}</div>
    </div>
  );
}

function GearValue({ gear, equip, changed, prev }: { gear: string | null | undefined; equip?: string | null; changed?: boolean; prev?: string | null }) {
  const { t } = getT();
  // The Jockey Club's official gear code wins when we have it; otherwise Supertote's letters.
  if (equip && equip.toUpperCase() === "NA") return <span className="opacity-70">—</span>; // official: no gear
  if (equip) {
    return (
      <span
        className={`gear-chip ${changed ? "is-changed" : ""}`}
        title={changed ? `${t("Gear changed")}: ${prev ?? "?"} → ${equip}` : undefined}
      >
        {equip}{changed ? "*" : ""}
      </span>
    );
  }
  const items = (gear ?? "").split(",").map((g) => g.trim()).filter(Boolean);
  if (items.length === 0) return <span className="opacity-70">—</span>;
  return (
    <span className="inline-flex gap-1 flex-wrap justify-center">
      {items.map((g) => <span key={g} className="gear-chip">{g}</span>)}
    </span>
  );
}

/** Horse weight with its change since the last run, e.g. 507 (−1). */
function HwtValue({ hwt, last }: { hwt: number | null; last: number | null }) {
  if (hwt == null) return <span className="opacity-70">—</span>;
  const diff = last != null ? hwt - last : null;
  return (
    <span className="inline-flex flex-col items-center leading-tight">
      <span>{hwt}</span>
      {diff != null && diff !== 0 && (
        <span className={`text-[0.6rem] font-semibold ${diff > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
          {diff > 0 ? "+" : "−"}{Math.abs(diff)}
        </span>
      )}
    </span>
  );
}

type Movement = { prev?: string | null; open?: string | null; changedAt?: string | null };

/** ▲ drifting (price lengthened) / ▼ firming (price shortened), vs the previous price. */
function MoveBadge({ value, prev, open, changedAt }: { value: string | null } & Movement) {
  const { t } = getT();
  if (!value || !prev) return null;
  const now = Number(value), before = Number(prev);
  if (!Number.isFinite(now) || !Number.isFinite(before) || now === before) return null;
  const up = now > before; // bigger number = longer price = drifting
  const diff = Math.abs(now - before);
  const fresh = !!changedAt && Date.now() - new Date(changedAt).getTime() < 15 * 60 * 1000;
  const label = `${up ? t("Drifting") : t("Firming")} — ${t("was {n}", { n: prev })}${open && open !== prev ? ` · ${t("Opened {n}", { n: open })}` : ""}`;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`odds-move ${up ? "is-up" : "is-down"} ${fresh ? "is-fresh" : ""}`} title={label} aria-label={label}>
      <Icon size={11} strokeWidth={3} />
      {Number.isInteger(diff) ? diff : diff.toFixed(1)}
    </span>
  );
}

function OddsPill({ kind, value, prev, open, changedAt }: { kind: "win" | "place"; value: string | null } & Movement) {
  const { t } = getT();
  return (
    <div className={`odds-pill odds-${kind} ${value ? "" : "is-empty"}`}>
      <span className="odds-label">{kind === "win" ? t("Win") : t("Place")}</span>
      <span className="odds-right">
        <MoveBadge value={value} prev={prev} open={open} changedAt={changedAt} />
        <span className="odds-value">{value ?? "—"}</span>
      </span>
    </div>
  );
}

function OddsRow({ win, place, winMove, placeMove }: { win: string | null; place: string | null; winMove?: Movement; placeMove?: Movement }) {
  if (!win && !place) return null;
  return (
    <div className="odds-row">
      <OddsPill kind="win" value={win} {...winMove} />
      <OddsPill kind="place" value={place} {...placeMove} />
    </div>
  );
}

function TipPill() {
  const { t } = getT();
  return (
    <span className="pill pill-gold pill-tip inline-flex items-center gap-1 !text-[0.6rem] !py-0.5">
      <Star size={10} fill="currentColor" /> {t("Tip")}
    </span>
  );
}

function HorseName({ horse }: { horse: HorseSummary | null }) {
  const { t } = getT();
  return horse
    ? <Link href={`/horses/${horse.id}`} className="font-semibold text-[1.02rem] leading-tight hover:underline">{horse.name}</Link>
    : <span className="font-semibold opacity-70">{t("Unknown")}</span>;
}

/** Recent finishing positions, newest first: wins gold, places solid, the rest muted. */
function FormPills({ form, daysSince }: { form: string[]; daysSince?: string | null }) {
  const { t } = getT();
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end" aria-label={t("Recent form")}>
      {daysSince && <span className="text-[0.62rem] opacity-65 mr-1 whitespace-nowrap">{t("Last run {n}d ago", { n: daysSince })}</span>}
      {form.map((f, i) => (
        <span key={i} className={`form-pill ${f === "1" ? "is-win" : f === "2" || f === "3" ? "is-place" : ""}`} title={i === 0 ? t("Latest run") : undefined}>{f}</span>
      ))}
    </div>
  );
}

const delayFor = (index?: number) => ({ "--delay": `${Math.min(index ?? 0, 12) * 55}ms` } as React.CSSProperties);

function ageSex(horse: HorseSummary | null, t: (k: string, v?: Record<string, string | number>) => string) {
  const age = horse?.age ? t("{n}yo", { n: horse.age }) : t("N/A");
  return `${age} ${horse?.sex ? t(horse.sex) : ""}`.trim();
}

export function EntryRow({
  number, horse, jockeyName, jockeyId, weight, gate, odds, placeOdds = null, gear = null, isTipped = false, rating = null, hwt = null, hwtLast = null, equip = null, gearChanged = false, gearPrev = null, oddsPrev = null, placeOddsPrev = null, oddsOpen = null, placeOddsOpen = null, oddsChangedAt = null, form, daysSince = null, index, follow,
}: BaseProps & {
  gate: number | null; odds: string | null; placeOdds?: string | null; gear?: string | null; isTipped?: boolean;
  rating?: number | null; hwt?: number | null; hwtLast?: number | null; equip?: string | null; gearChanged?: boolean; gearPrev?: string | null;
  oddsPrev?: string | null; placeOddsPrev?: string | null; oddsOpen?: string | null; placeOddsOpen?: string | null; oddsChangedAt?: string | null;
  form?: string[];
  // Days since the horse last ran (from the Jockey Club time factors), when known.
  daysSince?: string | null;
  // When set, a small "follow for alerts" bell is shown next to the horse's name.
  follow?: { signedIn: boolean; following: boolean };
}) {
  const { t, lang } = getT();
  const places = horse ? horse.seconds + horse.thirds : 0;
  return (
    <div className="runner-row" style={delayFor(index)}>
      <div className="runner-head">
        <div className="runner-rail">
          <div className="runner-number">{number ?? t("N/A")}</div>
          <SilkImage url={horse?.silk_image_url} title={horse?.name} size={44} fallback />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <HorseName horse={horse} />
            {isTipped && <TipPill />}
          </div>
          <div className="text-xs opacity-70 mt-0.5">{ageSex(horse, t)}</div>
        </div>
        {follow && horse && (
          <div className="shrink-0 self-start">
            <FollowButton variant="icon" horseId={horse.id} horseName={horse.name} initialFollowing={follow.following} signedIn={follow.signedIn} />
          </div>
        )}
      </div>

      <div className="people-grid">
        <Person kind="Jockey" name={jockeyName} href={jockeyId ? `/jockeys/${jockeyId}` : null} />
        <Person kind="Trainer" name={horse?.trainer?.name} href={horse?.trainer ? `/trainers/${horse.trainer.id}` : null} />
      </div>

      <div className="stats-grid">
        <Stat label="Gate">{gate ?? t("N/A")}</Stat>
        <Stat label="Weight">{weight ? `${weight}kg` : t("N/A")}</Stat>
        <Stat label="Rating">{rating ?? horse?.rating ?? t("N/A")}</Stat>
        {hwt != null && <Stat label="HWT"><HwtValue hwt={hwt} last={hwtLast} /></Stat>}
        <Stat label="Gear"><GearValue gear={gear} equip={equip} changed={gearChanged} prev={gearPrev} /></Stat>
      </div>

      <OddsRow
        win={odds} place={placeOdds}
        winMove={{ prev: oddsPrev, open: oddsOpen, changedAt: oddsChangedAt }}
        placeMove={{ prev: placeOddsPrev, open: placeOddsOpen, changedAt: oddsChangedAt }}
      />

      {horse && horse.starts > 0 && (
        <div className="form-panel flex items-center gap-2.5 mt-3">
          <FormRing wins={horse.wins} places={places} starts={horse.starts} />
          <div className="text-xs opacity-70 leading-snug">
            <span className="font-semibold">{horse.wins}</span>{t("W")}-<span className="font-semibold">{places}</span>{t("P")}
            <span className="opacity-70"> {t("from {n}", { n: horse.starts })} · </span>
            <span className="whitespace-nowrap">{fmtMoney(horse.earnings, lang)}</span>
          </div>
          {form && form.length > 0 && (
            <div className="ml-auto"><FormPills form={form} daysSince={daysSince} /></div>
          )}
        </div>
      )}
      {!(horse && horse.starts > 0) && (
        form && form.length > 0 ? (
          <div className="mt-3"><FormPills form={form} daysSince={daysSince} /></div>
        ) : (
          <div className="mt-3 text-xs opacity-65">{t("First-time starter — no previous runs recorded.")}</div>
        )
      )}
    </div>
  );
}

export function ResultRow({
  number, horse, jockeyName, jockeyId, weight, position, finishTime, margin, winOdds = null, placeOdds = null, gear = null, isTipped = false, rating = null, hwt = null, hwtLast = null, equip = null, gearChanged = false, gearPrev = null, performanceRating, racePrize, prizeSplit = null, index,
}: BaseProps & {
  position: number; finishTime: string | null; margin: string | null;
  winOdds?: string | null; placeOdds?: string | null; gear?: string | null; isTipped?: boolean;
  rating?: number | null; hwt?: number | null; hwtLast?: number | null; equip?: string | null; gearChanged?: boolean; gearPrev?: string | null;
  performanceRating: number | null; racePrize: number; prizeSplit?: number[] | null;
}) {
  const { t, lang } = getT();
  return (
    <div className={`runner-row ${position === 1 ? "is-winner" : ""}`} style={delayFor(index)}>
      <div className="runner-head">
        <div className="runner-rail">
          <div className="flex flex-col items-center gap-1">
            <div className={`runner-number ${podiumClass(position)}`}>{position}</div>
            <span className="text-[0.6rem] font-semibold opacity-70 leading-none">{ordinal(lang, position)}</span>
          </div>
          <SilkImage url={horse?.silk_image_url} title={horse?.name} size={44} fallback />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <HorseName horse={horse} />
            {isTipped && <TipPill />}
          </div>
          <div className="text-xs opacity-70 mt-0.5">{margin ?? ageSex(horse, t)}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm leading-tight">{finishTime ?? t("N/A")}</div>
          <div className="text-xs opacity-70 mt-0.5"><PrizeWon position={position} racePrize={racePrize} prizeSplit={prizeSplit} /></div>
        </div>
      </div>

      <div className="people-grid">
        <Person kind="Jockey" name={jockeyName} href={jockeyId ? `/jockeys/${jockeyId}` : null} />
        <Person kind="Trainer" name={horse?.trainer?.name} href={horse?.trainer ? `/trainers/${horse.trainer.id}` : null} />
      </div>

      <div className="stats-grid">
        <Stat label="No.">{number ?? t("N/A")}</Stat>
        <Stat label="Weight">{weight ? `${weight}kg` : t("N/A")}</Stat>
        {rating != null && <Stat label="Rating">{rating}</Stat>}
        {hwt != null && <Stat label="HWT"><HwtValue hwt={hwt} last={hwtLast} /></Stat>}
        <Stat label="Gear"><GearValue gear={gear} equip={equip} changed={gearChanged} prev={gearPrev} /></Stat>
        {performanceRating != null && rating == null && <Stat label="Perf">{performanceRating}</Stat>}
      </div>

      <OddsRow win={winOdds} place={placeOdds} />
    </div>
  );
}
