import Link from "next/link";
import { ArrowDown, ArrowUp, Star } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { fmtOdds, oddsDirection, parseOdds } from "@/lib/raceState";
import type { RaceEntry } from "@/lib/races";

type Row = {
  entry: RaceEntry;
  win: number | null;
  open: number | null;
  /** Relative move since the market opened: negative = firmed, positive = drifted. */
  change: number | null;
};

function toRows(entries: RaceEntry[]): Row[] {
  return entries.map((entry) => {
    const win = parseOdds(entry.odds);
    const open = parseOdds(entry.odds_open);
    return { entry, win, open, change: win != null && open != null && open !== win ? (win - open) / open : null };
  });
}

/** Compact "who's the favourite?" view of a race: runners ranked by win price, with the
 *  movement since the market opened and the biggest firmer / drifter called out. The full
 *  runner cards sit below it — this is the glanceable version for a phone. */
export default function MarketBoard({ entries }: { entries: RaceEntry[] }) {
  const { t } = getT();
  const rows = toRows(entries);
  const priced = rows.filter((r) => r.win != null).sort((a, b) => (a.win! - b.win!) || ((a.entry.runner_no ?? 99) - (b.entry.runner_no ?? 99)));
  const unpriced = rows.filter((r) => r.win == null).sort((a, b) => (a.entry.runner_no ?? 99) - (b.entry.runner_no ?? 99));
  const ordered = [...priced, ...unpriced];

  if (priced.length === 0) {
    return (
      <div className="panel">
        <h2 className="font-display text-xl">{t("Betting market")}</h2>
        <p className="text-sm opacity-70 mt-2">{t("Tote prices haven't been published for this race yet. They appear here automatically.")}</p>
      </div>
    );
  }

  const moved = rows.filter((r) => r.change != null);
  const firmest = [...moved].sort((a, b) => a.change! - b.change!)[0];
  const drifter = [...moved].sort((a, b) => b.change! - a.change!)[0];

  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display text-xl">{t("Betting market")}</h2>
        <span className="text-[0.7rem] opacity-70">{t("Win price · ranked shortest first")}</span>
      </div>

      {(firmest && firmest.change! < 0) || (drifter && drifter.change! > 0) ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {firmest && firmest.change! < 0 && (
            <span className="mover mover-down">
              <ArrowDown size={12} strokeWidth={3} /> {t("Firming")}: <strong>{firmest.entry.horses?.name ?? "—"}</strong> {fmtOdds(firmest.entry.odds_open)} → {fmtOdds(firmest.entry.odds)}
            </span>
          )}
          {drifter && drifter.change! > 0 && (
            <span className="mover mover-up">
              <ArrowUp size={12} strokeWidth={3} /> {t("Drifting")}: <strong>{drifter.entry.horses?.name ?? "—"}</strong> {fmtOdds(drifter.entry.odds_open)} → {fmtOdds(drifter.entry.odds)}
            </span>
          )}
        </div>
      ) : null}

      <ol className="market-list mt-3">
        {ordered.map((r, i) => {
          const e = r.entry;
          const dir = oddsDirection(e.odds, e.odds_prev);
          const isFav = i === 0 && r.win != null;
          return (
            <li key={e.id} className={`market-row ${isFav ? "is-fav" : ""}`}>
              <span className="market-rank">{r.win != null ? i + 1 : "–"}</span>
              <span className="runner-number !w-7 !h-7 !text-[0.72rem]">{e.runner_no ?? "–"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {e.horses ? (
                    <Link href={`/horses/${e.horses.id}`} className="font-semibold truncate hover:underline">{e.horses.name}</Link>
                  ) : (
                    <span className="font-semibold opacity-70">{t("Unknown")}</span>
                  )}
                  {e.is_tipped && <Star size={11} fill="currentColor" className="text-gold shrink-0" aria-label={t("Tip")} />}
                  {isFav && <span className="pill pill-gold !text-[0.58rem] !py-0 !px-1.5">{t("Fav")}</span>}
                </div>
                <div className="text-[0.7rem] opacity-65 truncate">
                  {e.jockeys?.name ?? t("Unknown")}
                  {e.odds_open && r.change != null ? ` · ${t("Opened {n}", { n: fmtOdds(e.odds_open) ?? "" })}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                {dir && (dir === "down"
                  ? <ArrowDown size={13} strokeWidth={3} className="text-emerald-600" aria-label={t("Firming")} />
                  : <ArrowUp size={13} strokeWidth={3} className="text-red-600" aria-label={t("Drifting")} />)}
                <div>
                  <div className="font-mono font-bold tabular-nums leading-tight">{fmtOdds(e.odds) ?? "—"}</div>
                  <div className="text-[0.65rem] opacity-60 font-mono leading-tight">{e.place_odds ? `${t("Place")} ${fmtOdds(e.place_odds)}` : ""}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
