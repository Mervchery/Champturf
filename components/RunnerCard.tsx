import Link from "next/link";
import type { ReactNode } from "react";
import SilkImage from "@/components/SilkImage";
import { fmtMoney } from "@/lib/format";
import type { HorseSummary } from "@/lib/races";

function podiumClass(position: number | null) {
  if (position === 1) return "podium-1";
  if (position === 2) return "podium-2";
  if (position === 3) return "podium-3";
  return "";
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
  // in the badge rather than silently falling back to some other number.
  number: number | null;
  horse: HorseSummary | null;
  jockeyName: string | null;
  weight: number | null;
  gate: number | null;
};

// Shared right-hand info column — gate is always the first line, on both
// entries and results, so the card reads consistently no matter which
// mode the race page is in. Every row gets the same fixed width too, so
// the whole column of numbers lines up regardless of digit count.
function InfoStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="text-xs opacity-60 tabular-nums">
      <span className="inline-block w-9 opacity-70">{label}</span>{value}
    </div>
  );
}

export function EntryRow({
  number, horse, jockeyName, weight, gate, odds, form,
}: BaseProps & { odds: string | null; form?: string[] }) {
  return (
    <div className="runner-row">
      <div className="runner-number">{number ?? "N/A"}</div>
      <SilkImage url={horse?.silk_image_url} title={horse?.name} size={34} />
      <div className="flex-1 min-w-0">
        {horse ? (
          <Link href={`/horses/${horse.id}`} className="font-semibold hover:underline">{horse.name}</Link>
        ) : (
          <span className="font-semibold opacity-50">Unknown</span>
        )}
        <div className="text-xs opacity-60 mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
          <span>{horse?.age ? `${horse.age}yo` : "N/A"} {horse?.sex ?? ""}</span>
          <span>·</span>
          <span>{horse?.stable ? <Link href={`/stables/${horse.stable.id}`} className="hover:underline">{horse.stable.name}</Link> : "Unknown stable"}</span>
          <span>·</span>
          <span>{horse?.trainer ? <Link href={`/trainers/${horse.trainer.id}`} className="hover:underline">{horse.trainer.name}</Link> : "Unknown trainer"}</span>
        </div>
        {form && form.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {form.map((f, i) => <span key={i} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"} !text-[0.6rem] !py-0.5`}>{f}</span>)}
          </div>
        )}
      </div>
      <div className="text-right shrink-0 hidden sm:block space-y-0.5">
        <InfoStat label="Gate" value={gate ?? "N/A"} />
        <InfoStat label="Wgt" value={weight ? `${weight}kg` : "N/A"} />
        <InfoStat label="Rtg" value={horse?.rating ?? "N/A"} />
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm">{jockeyName ?? "Unknown"}</div>
        {odds && <div className="pill pill-outline mt-1 !text-[0.62rem]">{odds}</div>}
      </div>
    </div>
  );
}

export function ResultRow({
  number, horse, jockeyName, weight, gate, position, finishTime, margin, startingPrice, performanceRating, racePrize,
}: BaseProps & {
  position: number; finishTime: string | null; margin: string | null;
  startingPrice: string | null; performanceRating: number | null; racePrize: number;
}) {
  return (
    <div className={`runner-row ${position === 1 ? "is-winner" : ""}`}>
      <div className={`runner-number ${podiumClass(position)}`}>{position}</div>
      <SilkImage url={horse?.silk_image_url} title={horse?.name} size={34} />
      <div className="flex-1 min-w-0">
        {horse ? (
          <Link href={`/horses/${horse.id}`} className="font-semibold hover:underline">{horse.name}</Link>
        ) : (
          <span className="font-semibold opacity-50">Unknown</span>
        )}
        <div className="text-xs opacity-60 mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
          <span>{number != null ? `No. ${number}` : "No. N/A"}</span>
          <span>·</span>
          <span>{jockeyName ?? "Unknown"}</span>
          <span>·</span>
          <span>{horse?.trainer ? <Link href={`/trainers/${horse.trainer.id}`} className="hover:underline">{horse.trainer.name}</Link> : "Unknown trainer"}</span>
          {margin && <><span>·</span><span>{margin}</span></>}
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block space-y-0.5">
        <InfoStat label="Gate" value={gate ?? "N/A"} />
        <InfoStat label="Wgt" value={weight ? `${weight}kg` : "N/A"} />
        <InfoStat label="SP" value={startingPrice ?? "N/A"} />
        {performanceRating != null && <InfoStat label="Perf" value={performanceRating} />}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm">{finishTime ?? "N/A"}</div>
        <div className="text-xs opacity-60 mt-0.5"><PrizeWon position={position} racePrize={racePrize} /></div>
      </div>
    </div>
  );
}
