import Link from "next/link";
import SilkImage from "@/components/SilkImage";
import { fmtMoney } from "@/lib/format";
import { JockeyCapIcon, BinocularsIcon } from "@/components/RacingIcons";
import { Star } from "lucide-react";
import type { HorseSummary } from "@/lib/races";

function podiumClass(position: number | null) {
  if (position === 1) return "podium-1";
  if (position === 2) return "podium-2";
  if (position === 3) return "podium-3";
  return "";
}

// "1st", "2nd", "3rd", "4th"… — handles the 11th/12th/13th exceptions.
function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function PrizeWon({ position, racePrize }: { position: number; racePrize: number }) {
  // Mirrors the same 60/20/10 split the database trigger uses to compute
  // horse earnings (see race_entries_results_migration.sql) — shown here
  // purely for display, not a separate stored value.
  const pct = position === 1 ? 0.6 : position === 2 ? 0.2 : position === 3 ? 0.1 : 0;
  if (pct === 0) return <span className="opacity-50">—</span>;
  return <>{fmtMoney(Math.round(racePrize * pct))}</>;
}

type BaseProps = {
  // The racecard "No" — not the gate/barrier number. Null renders as "N/A"
  // in the badge (or the info line, for results) rather than silently
  // falling back to some other number.
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
// Small building blocks shared by EntryRow and ResultRow. Everything sits on
// the same grid (people → stats → odds) so cards line up the same way no
// matter how long a name is or which fields a runner is missing.
// ---------------------------------------------------------------------

function Person({ kind, name, href }: { kind: "Jockey" | "Trainer"; name: string | null | undefined; href?: string | null }) {
  const Icon = kind === "Jockey" ? JockeyCapIcon : BinocularsIcon;
  return (
    <div className="person">
      <span className="person-icon" aria-hidden="true"><Icon size={16} /></span>
      <span className="min-w-0">
        <span className="person-label">{kind}</span>
        <span className="person-name">
          {name ? (href ? <Link href={href} className="hover:underline">{name}</Link> : name) : <span className="opacity-50">Unknown</span>}
        </span>
      </span>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="stat-cell">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{children}</div>
    </div>
  );
}

function GearValue({ gear }: { gear: string | null | undefined }) {
  const items = (gear ?? "").split(",").map((g) => g.trim()).filter(Boolean);
  if (items.length === 0) return <span className="opacity-40">—</span>;
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {items.map((g) => <span key={g} className="gear-chip">{g}</span>)}
    </span>
  );
}

function OddsPill({ kind, value }: { kind: "win" | "place"; value: string | null }) {
  return (
    <div className={`odds-pill odds-${kind} ${value ? "" : "is-empty"}`}>
      <span className="odds-label">{kind === "win" ? "Win" : "Place"}</span>
      <span className="odds-value">{value ?? "—"}</span>
    </div>
  );
}

function OddsRow({ win, place }: { win: string | null; place: string | null }) {
  if (!win && !place) return null;
  return (
    <div className="odds-row">
      <OddsPill kind="win" value={win} />
      <OddsPill kind="place" value={place} />
    </div>
  );
}

function TipPill() {
  return (
    <span className="pill pill-gold pill-tip inline-flex items-center gap-1 !text-[0.6rem] !py-0.5">
      <Star size={10} fill="currentColor" /> Tip
    </span>
  );
}

function HorseName({ horse }: { horse: HorseSummary | null }) {
  return horse
    ? <Link href={`/horses/${horse.id}`} className="font-semibold text-[1.02rem] leading-tight hover:underline">{horse.name}</Link>
    : <span className="font-semibold opacity-50">Unknown</span>;
}

const delayFor = (index?: number) => ({ "--delay": `${Math.min(index ?? 0, 12) * 55}ms` } as React.CSSProperties);

export function EntryRow({
  number, horse, jockeyName, jockeyId, weight, gate, odds, placeOdds = null, gear = null, isTipped = false, form, index,
}: BaseProps & { gate: number | null; odds: string | null; placeOdds?: string | null; gear?: string | null; isTipped?: boolean; form?: string[] }) {
  const places = horse ? horse.seconds + horse.thirds : 0;
  return (
    <div className="runner-row" style={delayFor(index)}>
      {/* Left rail: number over silk, nothing else, so it never stretches. */}
      <div className="runner-rail">
        <div className="runner-number">{number ?? "N/A"}</div>
        <SilkImage url={horse?.silk_image_url} title={horse?.name} size={40} fallback />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <HorseName horse={horse} />
          {isTipped && <TipPill />}
        </div>
        <div className="text-xs opacity-60 mt-0.5">{horse?.age ? `${horse.age}yo` : "N/A"} {horse?.sex ?? ""}</div>

        <div className="people-grid">
          <Person kind="Jockey" name={jockeyName} href={jockeyId ? `/jockeys/${jockeyId}` : null} />
          <Person kind="Trainer" name={horse?.trainer?.name} href={horse?.trainer ? `/trainers/${horse.trainer.id}` : null} />
        </div>

        <div className="stats-grid">
          <Stat label="Gate">{gate ?? "N/A"}</Stat>
          <Stat label="Weight">{weight ? `${weight}kg` : "N/A"}</Stat>
          <Stat label="Rating">{horse?.rating ?? "N/A"}</Stat>
          <Stat label="Gear"><GearValue gear={gear} /></Stat>
        </div>

        <OddsRow win={odds} place={placeOdds} />

        {horse && horse.starts > 0 && (
          <div className="form-panel flex items-center gap-2.5 mt-3">
            <FormRing wins={horse.wins} places={places} starts={horse.starts} />
            <div className="text-xs opacity-70 leading-snug">
              <span className="font-semibold">{horse.wins}</span>W-<span className="font-semibold">{places}</span>P
              <span className="opacity-50"> from {horse.starts} · </span>
              <span className="whitespace-nowrap">{fmtMoney(horse.earnings)}</span>
            </div>
          </div>
        )}
        {form && form.length > 0 && (
          <div className="flex gap-1 mt-2.5 flex-wrap">
            {form.map((f, i) => <span key={i} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"} !text-[0.6rem] !py-0.5`}>{f}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

export function ResultRow({
  number, horse, jockeyName, jockeyId, weight, position, finishTime, margin, winOdds = null, placeOdds = null, gear = null, isTipped = false, performanceRating, racePrize, index,
}: BaseProps & {
  position: number; finishTime: string | null; margin: string | null;
  winOdds?: string | null; placeOdds?: string | null; gear?: string | null; isTipped?: boolean;
  performanceRating: number | null; racePrize: number;
}) {
  return (
    <div className={`runner-row ${position === 1 ? "is-winner" : ""}`} style={delayFor(index)}>
      <div className="runner-rail">
        <div className={`runner-number ${podiumClass(position)}`}>{position}</div>
        <span className="text-[0.6rem] font-semibold opacity-55 leading-none -mt-0.5">{ordinal(position)}</span>
        <SilkImage url={horse?.silk_image_url} title={horse?.name} size={40} fallback />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <HorseName horse={horse} />
              {isTipped && <TipPill />}
            </div>
            {margin && <div className="text-xs opacity-60 mt-0.5">{margin}</div>}
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-sm leading-tight">{finishTime ?? "N/A"}</div>
            <div className="text-xs opacity-60 mt-0.5"><PrizeWon position={position} racePrize={racePrize} /></div>
          </div>
        </div>

        <div className="people-grid">
          <Person kind="Jockey" name={jockeyName} href={jockeyId ? `/jockeys/${jockeyId}` : null} />
          <Person kind="Trainer" name={horse?.trainer?.name} href={horse?.trainer ? `/trainers/${horse.trainer.id}` : null} />
        </div>

        <div className="stats-grid">
          <Stat label="No.">{number ?? "N/A"}</Stat>
          <Stat label="Weight">{weight ? `${weight}kg` : "N/A"}</Stat>
          <Stat label="Gear"><GearValue gear={gear} /></Stat>
          {performanceRating != null && <Stat label="Perf">{performanceRating}</Stat>}
        </div>

        <OddsRow win={winOdds} place={placeOdds} />
      </div>
    </div>
  );
}
