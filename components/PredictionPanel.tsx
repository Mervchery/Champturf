import Link from "next/link";
import { Sparkles, Star, Info } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { fmtOdds } from "@/lib/raceState";
import type { RaceEntry } from "@/lib/races";
import type { ModelRun, Prediction } from "@/lib/predictions";

const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;

/** Model predictions for an upcoming race, in the same quiet style as the betting market panel.
 *  Shows what the data supports and says so plainly when it doesn't. */
export default function PredictionPanel({ entries, predictions, run }: { entries: RaceEntry[]; predictions: Prediction[]; run: ModelRun | null }) {
  const { t } = getT();
  if (!run) return null; // predictions not set up yet — the rest of the page stays exactly as it was

  if (run.status !== "ready") {
    return (
      <div className="panel mt-8">
        <h2 className="font-display text-xl flex items-center gap-2"><Sparkles size={18} /> {t("Predictions")}</h2>
        <p className="text-sm opacity-75 mt-2">
          {t("Not enough race history yet to predict reliably ({n} races so far). Predictions appear automatically once there is enough data — nothing is guessed.", { n: String(run.n_races) })}
        </p>
      </div>
    );
  }
  if (predictions.length === 0) {
    return (
      <div className="panel mt-8">
        <h2 className="font-display text-xl flex items-center gap-2"><Sparkles size={18} /> {t("Predictions")}</h2>
        <p className="text-sm opacity-75 mt-2">{t("No prediction for this race yet. It appears once the runners are declared.")}</p>
      </div>
    );
  }

  const byHorse = new Map(entries.filter((e) => e.horses).map((e) => [e.horses!.id, e]));
  const rows = predictions.map((p) => ({ p, e: byHorse.get(p.horse_id) })).filter((r) => r.e);
  if (rows.length === 0) return null;
  const maxP = Math.max(...rows.map((r) => r.p.win_prob));
  const top = rows[0];
  const second = rows[1];
  const values = rows.filter((r) => r.p.is_value);
  const usesMarket = top.p.uses_market;
  const m = run.metrics?.metrics;
  const me = (usesMarket ? m?.model_B : m?.model_A) ?? m?.model_A;
  const fav = m?.market_favourite;
  const confLabel = { high: t("High confidence"), medium: t("Medium confidence"), low: t("Low confidence") };

  return (
    <div className="panel mt-8">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display text-xl flex items-center gap-2"><Sparkles size={18} /> {t("Predictions")}</h2>
        <span className="text-[0.7rem] opacity-70">{usesMarket ? t("Form + live prices") : t("Form only — no prices yet")}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
        <div className="stat-cell !text-left border border-line rounded-xl">
          <div className="stat-label !text-left">{t("Top pick")}</div>
          <div className="font-semibold leading-tight mt-0.5 truncate">{top.e!.horses!.name}</div>
          <div className="text-xs opacity-70 mt-0.5">
            {t("{p} win chance", { p: pct(top.p.win_prob) })} · {confLabel[top.p.confidence]}
            {second && top.p.win_prob < second.p.win_prob * 1.25 ? ` · ${t("close to {n}", { n: second.e!.horses!.name })}` : ""}
          </div>
        </div>
        <div className="stat-cell !text-left border border-line rounded-xl">
          <div className="stat-label !text-left">{t("Value watch")}</div>
          {values.length ? (
            <>
              <div className="font-semibold leading-tight mt-0.5 truncate">{values.map((v) => v.e!.horses!.name).join(", ")}</div>
              <div className="text-xs opacity-70 mt-0.5">{t("Model rates them better than their price")}</div>
            </>
          ) : (
            <div className="text-xs opacity-70 mt-1">{usesMarket ? t("No clear value at current prices") : t("Needs live prices to judge value")}</div>
          )}
        </div>
      </div>

      <ol className="market-list mt-3">
        {rows.map(({ p, e }) => (
          <li key={p.horse_id} className={`market-row !items-start ${p.rank === 1 ? "is-fav" : ""}`}>
            <span className="market-rank mt-1">{p.rank}</span>
            <span className="runner-number !w-7 !h-7 !text-[0.72rem] mt-0.5">{e!.runner_no ?? "–"}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Link href={`/horses/${e!.horses!.id}`} className="font-semibold truncate hover:underline">{e!.horses!.name}</Link>
                {p.is_value && <Star size={11} fill="currentColor" className="text-gold shrink-0" aria-label={t("Value")} />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 flex-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-gold2" style={{ width: `${Math.max(3, (p.win_prob / maxP) * 100)}%` }} />
                </div>
                <span className="text-[0.7rem] font-semibold tabular-nums w-9 text-right">{pct(p.win_prob)}</span>
              </div>
              {p.factors && p.factors.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.factors.map((f) => (
                    <span key={f.label} className={`text-[0.66rem] px-1.5 py-0.5 rounded-full border ${f.impact < 0 ? "border-red-700/30 text-red-700 dark:text-red-400" : "border-line opacity-80"}`}>
                      {f.impact < 0 ? "− " : "+ "}{t(f.label)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right shrink-0 w-[4.6rem]">
              <div className="text-[0.66rem] font-semibold uppercase tracking-wide opacity-70">{confLabel[p.confidence].split(" ")[0]}</div>
              {p.is_value && p.fair_odds != null ? (
                <div className="text-[0.62rem] leading-tight opacity-70 mt-0.5">{t("Fair price")} {fmtOdds(String(p.fair_odds))}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 text-xs opacity-75 flex gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <div>
          {me ? (
            <p>
              {t("Tested on {n} unseen past races ({a} to {b}): the top pick won {w}, finished in the top 3 {x}.", {
                n: String(run.n_test_races), a: run.test_from ?? "", b: run.test_to ?? "", w: pct(me.win_rate), x: pct(me.top3_rate),
              })}{" "}
              {fav ? t("Backing the market favourite won {f}.", { f: pct(fav.win_rate) }) : ""}
            </p>
          ) : null}
          <p className="mt-1">{t("Probabilities are estimates from past form, not guarantees. Value picks are not proven profitable.")}</p>
        </div>
      </div>
    </div>
  );
}
