import Link from "next/link";
import Silk from "@/components/Silk";
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
  number: number;
  horse: HorseSummary | null;
  jockeyName: string | null;
  weight: number | null;
};

export function EntryRow({
  number, horse, jockeyName, weight, gate, odds, form,
}: BaseProps & { gate: number | null; odds: string | null; form?: string[] }) {
  return (
    <div className="runner-row">
      <div className="runner-number">{number}</div>
      <Silk
        primary={horse?.stable?.silk_primary}
        secondary={horse?.stable?.silk_secondary}
        cap={horse?.stable?.silk_cap}
        pattern={horse?.stable?.silk_pattern}
        title={horse?.stable?.name}
        size={34}
      />
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
      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-xs opacity-60">Gate {gate ?? "N/A"}</div>
        <div className="text-xs opacity-60">{weight ? `${weight}kg` : "N/A"}</div>
        <div className="text-xs opacity-60">{horse?.rating ?? "N/A"} rtg</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm">{jockeyName ?? "Unknown"}</div>
        {odds && <div className="pill pill-outline mt-1 !text-[0.62rem]">{odds}</div>}
      </div>
    </div>
  );
}

export function ResultRow({
  number, horse, jockeyName, weight, position, finishTime, margin, startingPrice, performanceRating, racePrize,
}: BaseProps & {
  position: number; finishTime: string | null; margin: string | null;
  startingPrice: string | null; performanceRating: number | null; racePrize: number;
}) {
  return (
    <div className={`runner-row ${position === 1 ? "is-winner" : ""}`}>
      <div className={`runner-number ${podiumClass(position)}`}>{position}</div>
      <Silk
        primary={horse?.stable?.silk_primary}
        secondary={horse?.stable?.silk_secondary}
        cap={horse?.stable?.silk_cap}
        pattern={horse?.stable?.silk_pattern}
        title={horse?.stable?.name}
        size={34}
      />
      <div className="flex-1 min-w-0">
        {horse ? (
          <Link href={`/horses/${horse.id}`} className="font-semibold hover:underline">{horse.name}</Link>
        ) : (
          <span className="font-semibold opacity-50">Unknown</span>
        )}
        <div className="text-xs opacity-60 mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
          <span>{jockeyName ?? "Unknown"}</span>
          <span>·</span>
          <span>{horse?.trainer ? <Link href={`/trainers/${horse.trainer.id}`} className="hover:underline">{horse.trainer.name}</Link> : "Unknown trainer"}</span>
          {margin && <><span>·</span><span>{margin}</span></>}
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-xs opacity-60">{weight ? `${weight}kg` : "N/A"}</div>
        <div className="text-xs opacity-60">SP {startingPrice ?? "N/A"}</div>
        {performanceRating != null && <div className="text-xs opacity-60">{performanceRating} perf.</div>}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm">{finishTime ?? "N/A"}</div>
        <div className="text-xs opacity-60 mt-0.5"><PrizeWon position={position} racePrize={racePrize} /></div>
      </div>
    </div>
  );
}
