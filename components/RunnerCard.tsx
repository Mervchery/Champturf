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
  weight: number | null;
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

// Tote price badge, filling the space under the number+silk. Win and Place
// are the only prices shown — both scraped from Supertote's own tote.
function OddsBadge({ label, value, gradient }: { label: string; value: string | null; gradient: string }) {
  if (!value) return null;
  return (
    <div
      className="w-full rounded-md px-1.5 py-1 text-center text-white shadow-sm"
      style={{ background: gradient }}
    >
      <div className="text-[0.5rem] font-semibold uppercase tracking-wide opacity-85 leading-none">{label}</div>
      <div className="text-xs font-bold leading-tight mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

const WIN_GRADIENT = "linear-gradient(135deg, #0f5c46, #2f9e78)";
const PLACE_GRADIENT = "linear-gradient(135deg, #1d4e89, #4a90d9)";

/** Jockey name with a riding-cap icon so it's obvious who the jockey is. */
function JockeyName({ name }: { name: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <JockeyCapIcon size={15} className="shrink-0 opacity-70" aria-label="Jockey" />
      <span>{name ?? "Unknown"}</span>
    </span>
  );
}

/** Trainer name (linked when known) with a binoculars icon. */
function TrainerName({ trainer }: { trainer: { id: string; name: string } | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <BinocularsIcon size={15} className="shrink-0 opacity-70" aria-label="Trainer" />
      {trainer ? <Link href={`/trainers/${trainer.id}`} className="hover:underline">{trainer.name}</Link> : <span>Unknown trainer</span>}
    </span>
  );
}

function GearChips({ gear }: { gear: string | null | undefined }) {
  const items = (gear ?? "").split(",").map((g) => g.trim()).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="opacity-70">Gear</span>
      {items.map((g) => <span key={g} className="pill pill-outline !text-[0.6rem] !py-0 !px-1.5 font-semibold">{g}</span>)}
    </span>
  );
}

export function EntryRow({
  number, horse, jockeyName, weight, gate, odds, placeOdds = null, gear = null, isTipped = false, form,
}: BaseProps & { gate: number | null; odds: string | null; placeOdds?: string | null; gear?: string | null; isTipped?: boolean; form?: string[] }) {
  const places = horse ? horse.seconds + horse.thirds : 0;
  return (
    <div className="runner-row">
      <div className="flex flex-col items-center gap-1.5 shrink-0 w-[38px]">
        <div className="runner-number mt-0.5">{number ?? "N/A"}</div>
        <SilkImage url={horse?.silk_image_url} title={horse?.name} size={34} />
        <OddsBadge label="Win" value={odds} gradient={WIN_GRADIENT} />
        <OddsBadge label="Place" value={placeOdds} gradient={PLACE_GRADIENT} />
      </div>
      <div className="flex-1 min-w-0">
        {/* Name + jockey share one header line so nothing floats off on
            its own with a big empty gap when either side is short. */}
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {horse ? (
                <Link href={`/horses/${horse.id}`} className="font-semibold hover:underline">{horse.name}</Link>
              ) : (
                <span className="font-semibold opacity-50">Unknown</span>
              )}
              {isTipped && (
                <span className="pill pill-gold !text-[0.6rem] !py-0.5 inline-flex items-center gap-1"><Star size={10} fill="currentColor" /> Tip</span>
              )}
            </div>
            <div className="text-xs opacity-60 mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 items-center">
              <span>{horse?.age ? `${horse.age}yo` : "N/A"} {horse?.sex ?? ""}</span>
              <span>·</span>
              <TrainerName trainer={horse?.trainer} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm"><JockeyName name={jockeyName} /></div>
          </div>
        </div>

        {/* Gate/weight/rating — always visible now, at every screen size. */}
        <div className="text-xs opacity-60 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>Gate {gate ?? "N/A"}</span>
          <span>{weight ? `${weight}kg` : "N/A"}</span>
          <span>Rtg {horse?.rating ?? "N/A"}</span>
          <GearChips gear={gear} />
        </div>

        {horse && horse.starts > 0 && (
          <div className="form-panel flex items-center gap-2.5 mt-2">
            <FormRing wins={horse.wins} places={places} starts={horse.starts} />
            <div className="text-xs opacity-70 leading-snug">
              <span className="font-semibold">{horse.wins}</span>W-<span className="font-semibold">{places}</span>P
              <span className="opacity-50"> from {horse.starts} · </span>
              <span className="whitespace-nowrap">{fmtMoney(horse.earnings)}</span>
            </div>
          </div>
        )}
        {form && form.length > 0 && (
          <div className="flex gap-1 mt-2">
            {form.map((f, i) => <span key={i} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"} !text-[0.6rem] !py-0.5`}>{f}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

export function ResultRow({
  number, horse, jockeyName, weight, position, finishTime, margin, winOdds = null, placeOdds = null, gear = null, isTipped = false, performanceRating, racePrize,
}: BaseProps & {
  position: number; finishTime: string | null; margin: string | null;
  winOdds?: string | null; placeOdds?: string | null; gear?: string | null; isTipped?: boolean;
  performanceRating: number | null; racePrize: number;
}) {
  return (
    <div className={`runner-row ${position === 1 ? "is-winner" : ""}`}>
      {/* Finish position badge stays exactly as before — the ordinal label
          underneath is purely additive. */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className={`runner-number ${podiumClass(position)}`}>{position}</div>
        <span className="text-[0.6rem] font-semibold opacity-55 leading-none">{ordinal(position)}</span>
      </div>
      <SilkImage url={horse?.silk_image_url} title={horse?.name} size={34} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div className="min-w-0">
            {horse ? (
              <Link href={`/horses/${horse.id}`} className="font-semibold hover:underline">{horse.name}</Link>
            ) : (
              <span className="font-semibold opacity-50">Unknown</span>
            )}
            <div className="text-xs opacity-60 mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
              <JockeyName name={jockeyName} />
              <span>·</span>
              <TrainerName trainer={horse?.trainer} />
              {margin && <><span>·</span><span>{margin}</span></>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-sm">{finishTime ?? "N/A"}</div>
            <div className="text-xs opacity-60 mt-0.5"><PrizeWon position={position} racePrize={racePrize} /></div>
          </div>
        </div>
        <div className="text-xs opacity-60 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>No. {number ?? "N/A"}</span>
          <span>{weight ? `${weight}kg` : "N/A"}</span>
          <span>Win {winOdds ?? "N/A"}</span>
          <span>Place {placeOdds ?? "N/A"}</span>
          <GearChips gear={gear} />
          {isTipped && <span className="inline-flex items-center gap-1 text-gold2 font-semibold"><Star size={11} fill="currentColor" /> Tipped</span>}
          {performanceRating != null && <span>Perf {performanceRating}</span>}
        </div>
      </div>
    </div>
  );
}
