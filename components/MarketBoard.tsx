import Link from "next/link";
import { ArrowDown, ArrowUp, Star } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { ordinal } from "@/lib/i18n";
import { fmtOdds, oddsDirection, parseOdds } from "@/lib/raceState";
import type { RaceEntry } from "@/lib/races";

type Row = {
  entry: RaceEntry;
  win: number | null;
  open: number | null;
  /** Share of the market this runner holds (0–1), from its price relative to the whole field. */
  share: number | null;
  /** Relative move since the market opened: negative = firmed, positive = drifted. */
  change: number | null;
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const byNo = (a: RaceEntry, b: RaceEntry) => (a.runner_no ?? 99) - (b.runner_no ?? 99);

function toRows(entries: RaceEntry[]): Row[] {
  const parsed = entries.map((entry) => ({ entry, win: parseOdds(entry.odds), open: parseOdds(entry.odds_open) }));
  // Win prices are decimal returns, so 1 / price is the chance the market gives a runner.
  // Dividing by the field's total strips out the tote's margin so the shares add up to 100%.
  const total = parsed.reduce((sum, r) => sum + (r.win != null ? 1 / r.win : 0), 0);
  return parsed.map((r) => ({
    ...r,
    share: r.win != null && total > 0 ? 1 / r.win / total : null,
    change: r.win != null && r.open != null && r.open !== r.win ? (r.win - r.open) / r.open : null,
  }));
}

/** The race's betting market, read as a story rather than a second price list: who the
 *  money is on, how open the race is, where the tip sits, and who has moved since the market
 *  opened. Exact prices live on the runner cards above — this is what they add up to. */
export default function MarketBoard({ entries }: { entries: RaceEntry[] }) {
  const { t, lang } = getT();
  const rows = toRows(entries);
  const priced = rows.filter((r) => r.win != null).sort((a, b) => (a.win! - b.win!) || byNo(a.entry, b.entry));
  const unpriced = rows.filter((r) => r.win == null).sort((a, b) => byNo(a.entry, b.entry));

  if (priced.length === 0) {
    return (
      <div className="panel mt-8">
        <h2 className="font-display text-xl">{t("Betting market")}</h2>
        <p className="text-sm opacity-70 mt-2">{t("Tote prices haven't been published for this race yet. They appear here automatically.")}</p>
      </div>
    );
  }

  const fav = priced[0];
  const second = priced[1];
  const top3 = priced.slice(0, 3).reduce((s, r) => s + (r.share ?? 0), 0);
  // How the race looks: one standout, two horses clear, or wide open.
  const shape =
    priced.length < 3 ? null
    : second && fav.share! >= second.share! * 1.5 ? t("One clear favourite")
    : second && fav.share! + second.share! >= 0.5 ? t("A two-horse market")
    : t("Wide open");

  const tippedIdx = priced.findIndex((r) => r.entry.is_tipped);
  const tipped = tippedIdx >= 0 ? priced[tippedIdx] : null;

  const moved = rows.filter((r) => r.change != null);
  const firmest = [...moved].sort((a, b) => a.change! - b.change!)[0];
  const drifter = [...moved].sort((a, b) => b.change! - a.change!)[0];
  const maxShare = Math.max(...priced.map((r) => r.share ?? 0));
  const name = (r: Row) => r.entry.horses?.name ?? "—";

  return (
    <div className="panel mt-8">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display text-xl">{t("Betting market")}</h2>
        <span className="text-[0.7rem] opacity-70">{t("Share of the market · shortest price first")}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
        <div className="stat-cell !text-left border border-line rounded-xl">
          <div className="stat-label !text-left">{t("Market favourite")}</div>
          <div className="font-semibold leading-tight mt-0.5 truncate">{name(fav)}</div>
          <div className="text-xs opacity-70 mt-0.5">{t("{p} of the market", { p: pct(fav.share!) })}</div>
        </div>
        <div className="stat-cell !text-left border border-line rounded-xl">
          <div className="stat-label !text-left">{t("Shape of the race")}</div>
          <div className="font-semibold leading-tight mt-0.5">{shape ?? t("Small field")}</div>
          <div className="text-xs opacity-70 mt-0.5">{t("Top 3 hold {p}", { p: pct(top3) })}</div>
        </div>
        <div className="stat-cell !text-left border border-line rounded-xl">
          <div className="stat-label !text-left">{tipped ? t("Tip vs market") : t("Biggest mover")}</div>
          {tipped ? (
            <>
              <div className="font-semibold leading-tight mt-0.5 truncate">{name(tipped)}</div>
              <div className="text-xs opacity-70 mt-0.5">{t("{n} in the market", { n: ordinal(lang, tippedIdx + 1) })}</div>
            </>
          ) : firmest && firmest.change! < 0 ? (
            <>
              <div className="font-semibold leading-tight mt-0.5 truncate">{name(firmest)}</div>
              <div className="text-xs opacity-70 mt-0.5">{t("Firmed {p} since opening", { p: pct(Math.abs(firmest.change!)) })}</div>
            </>
          ) : (
            <div className="text-xs opacity-70 mt-1">{t("No big moves yet")}</div>
          )}
        </div>
      </div>

      {(firmest && firmest.change! < 0) || (drifter && drifter.change! > 0) ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {firmest && firmest.change! < 0 && (
            <span className="mover mover-down">
              <ArrowDown size={12} strokeWidth={3} /> {t("Firming")}: <strong>{name(firmest)}</strong> {fmtOdds(firmest.entry.odds_open)} → {fmtOdds(firmest.entry.odds)} ({pct(Math.abs(firmest.change!))})
            </span>
          )}
          {drifter && drifter.change! > 0 && (
            <span className="mover mover-up">
              <ArrowUp size={12} strokeWidth={3} /> {t("Drifting")}: <strong>{name(drifter)}</strong> {fmtOdds(drifter.entry.odds_open)} → {fmtOdds(drifter.entry.odds)} (+{pct(drifter.change!)})
            </span>
          )}
        </div>
      ) : null}

      <ol className="market-list mt-3">
        {priced.map((r, i) => {
          const e = r.entry;
          const dir = oddsDirection(e.odds, e.odds_prev);
          return (
            <li key={e.id} className={`market-row ${i === 0 ? "is-fav" : ""}`}>
              <span className="market-rank">{i + 1}</span>
              <span className="runner-number !w-7 !h-7 !text-[0.72rem]">{e.runner_no ?? "–"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {e.horses ? (
                    <Link href={`/horses/${e.horses.id}`} className="font-semibold truncate hover:underline">{e.horses.name}</Link>
                  ) : (
                    <span className="font-semibold opacity-70">{t("Unknown")}</span>
                  )}
                  {e.is_tipped && <Star size={11} fill="currentColor" className="text-gold shrink-0" aria-label={t("Tip")} />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 flex-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full bg-gold2" style={{ width: `${Math.max(3, (r.share! / maxShare) * 100)}%` }} />
                  </div>
                  <span className="text-[0.7rem] font-semibold tabular-nums w-9 text-right">{pct(r.share!)}</span>
                </div>
              </div>
              <div className="text-right shrink-0 w-[4.2rem]">
                {r.change != null ? (
                  <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${r.change < 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                    {r.change < 0 ? <ArrowDown size={12} strokeWidth={3} /> : <ArrowUp size={12} strokeWidth={3} />}
                    {pct(Math.abs(r.change))}
                  </span>
                ) : (
                  <span className="text-xs opacity-50">{t("Steady")}</span>
                )}
                {dir && <span className="sr-only">{dir === "down" ? t("Firming") : t("Drifting")}</span>}
                <div className="text-[0.62rem] opacity-60 leading-tight">{r.open != null && r.change != null ? t("Opened {n}", { n: fmtOdds(e.odds_open) ?? "" }) : t("since opening")}</div>
              </div>
            </li>
          );
        })}
        {unpriced.map((r) => (
          <li key={r.entry.id} className="market-row opacity-60">
            <span className="market-rank">–</span>
            <span className="runner-number !w-7 !h-7 !text-[0.72rem]">{r.entry.runner_no ?? "–"}</span>
            <span className="font-semibold truncate">{name(r)}</span>
            <span className="ml-auto text-xs">{t("No price yet")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
