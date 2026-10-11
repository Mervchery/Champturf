import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { getHorses } from "@/lib/horses";
import { getJockeys } from "@/lib/jockeys";
import { getTrainers } from "@/lib/trainers";
import { getStables } from "@/lib/stables";
import { getSeasonBoard, bySeason, lineOf } from "@/lib/season";
import InactiveBadge from "@/components/InactiveBadge";
import { fmtMoney } from "@/lib/format";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


const TABS = [
  ["horses", "Leading horses"],
  ["jockeys", "Leading jockeys"],
  ["trainers", "Leading trainers"],
  ["stables", "Leading stables"],
] as const;

export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Statistics"), description: t("Leading horses, jockeys, trainers and stables in Mauritius racing."), path: "/stats" });
}

export default async function StatsPage({ searchParams }: { searchParams: { tab?: string; scope?: string } }) {
  const { t, lang } = getT();
  const tab = (searchParams.tab as (typeof TABS)[number][0]) || "horses";
  const [horses, jockeys, trainers, stables, season] = await Promise.all([
    getHorses(), getJockeys(), getTrainers(), getStables(), getSeasonBoard(),
  ]);
  // Championships default to the current season only, so old seasons never pile up. "All time" stays available.
  const scope = season.available && searchParams.scope !== "all" ? "season" : "all";
  const year = season.ctx.year;
  const pro = jockeys.filter((j) => !j.apprentice);
  const jockeyRows = scope === "season" ? bySeason(pro.filter((j) => season.activeJockeys.has(j.id)), season.jockey) : [...pro].sort((a, b) => b.wins - a.wins);
  const trainerRows = scope === "season" ? bySeason(trainers.filter((x) => season.activeTrainers.has(x.id)), season.trainer) : [...trainers].sort((a, b) => b.wins - a.wins);
  const horseRows = scope === "season" ? bySeason(horses.filter((h) => lineOf(season.horse, h.id).runs > 0), season.horse) : [...horses].sort((a, b) => b.wins - a.wins);
  const inactiveJ = (id: string) => season.available && !season.activeJockeys.has(id);
  const inactiveT = (id: string) => season.available && !season.activeTrainers.has(id);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("DATA")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Statistics centre")}</h1>
        </div>
      </div>
      <section className="py-10 md:py-14">
        <div className="wrap">
          <div className="flex gap-1 border-b border-line mb-7 overflow-x-auto">
            {TABS.map(([id, label]) => (
              <Link key={id} href={`/stats?tab=${id}${scope === "all" && season.available ? "&scope=all" : ""}`} className={`pb-2.5 pr-5 text-sm whitespace-nowrap border-b-2 ${tab === id ? "border-coral font-semibold" : "border-transparent opacity-70"}`}>
                {t(label)}
              </Link>
            ))}
          </div>
          {season.available && tab !== "stables" && (
            <div className="flex items-center gap-2 mb-4 text-xs">
              <Link href={`/stats?tab=${tab}`} className={`pill ${scope === "season" ? "pill-gold" : "pill-outline"}`}>{year} {t("season")}</Link>
              <Link href={`/stats?tab=${tab}&scope=all`} className={`pill ${scope === "all" ? "pill-gold" : "pill-outline"}`}>{t("All time")}</Link>
              {scope === "season" && <span className="opacity-60">{t("{n} race days so far", { n: String(season.ctx.raceDays) })}</span>}
            </div>
          )}
          <div className="panel">
            {tab === "horses" && scope === "season" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Horse")}</th><th>{t("Trainer")}</th><th>{t("Starts")}</th><th>{t("Wins")}</th><th>{t("Placed")}</th></tr></thead>
                <tbody>
                  {horseRows.map((h, i) => { const l = lineOf(season.horse, h.id); return (
                    <tr key={h.id}><td>{i + 1}</td><td data-title>{h.name}</td><td data-label={t("Trainer")}>{h.trainer?.name ?? t("Unknown")}</td><td data-label={t("Starts")}>{l.runs}</td><td data-label={t("Wins")}>{l.wins}</td><td data-label={t("Placed")}>{l.places}</td></tr>
                  ); })}
                </tbody>
              </table>
            )}
            {tab === "horses" && scope === "all" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Horse")}</th><th>{t("Trainer")}</th><th>{t("Starts")}</th><th>{t("Wins")}</th><th>{t("Placed")}</th><th>{t("Earnings")}</th></tr></thead>
                <tbody>
                  {horseRows.map((h, i) => (
                    <tr key={h.id}><td>{i + 1}</td><td data-title>{h.name}</td><td data-label={t("Trainer")}>{h.trainer?.name ?? t("Unknown")}</td><td data-label={t("Starts")}>{h.starts}</td><td data-label={t("Wins")}>{h.wins}</td><td data-label={t("Placed")}>{h.seconds + h.thirds}</td><td data-label={t("Earnings")}>{fmtMoney(h.earnings, lang)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "jockeys" && scope === "season" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Jockey")}</th><th>{t("Nationality")}</th><th>{t("Rides")}</th><th>{t("Wins")}</th><th>{t("Win %")}</th></tr></thead>
                <tbody>
                  {jockeyRows.map((j, i) => { const l = lineOf(season.jockey, j.id); return (
                    <tr key={j.id}><td>{i + 1}</td><td data-title>{j.name}</td><td data-label={t("Nationality")}>{j.nationality ? t("nat:" + j.nationality) : t("N/A")}</td><td data-label={t("Rides")}>{l.runs}</td><td data-label={t("Wins")}>{l.wins}</td><td data-label={t("Win %")}>{l.runs > 0 ? Math.round((l.wins / l.runs) * 1000) / 10 : 0}%</td></tr>
                  ); })}
                </tbody>
              </table>
            )}
            {tab === "jockeys" && scope === "all" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Jockey")}</th><th>{t("Nationality")}</th><th>{t("Rides")}</th><th>{t("Wins")}</th><th>{t("Win %")}</th></tr></thead>
                <tbody>
                  {jockeyRows.map((j, i) => (
                    <tr key={j.id} className={inactiveJ(j.id) ? "opacity-60 grayscale" : undefined}><td>{i + 1}</td><td data-title>{j.name}{inactiveJ(j.id) && <span className="ml-2"><InactiveBadge year={year} kind="jockey" small /></span>}</td><td data-label={t("Nationality")}>{j.nationality ? t("nat:" + j.nationality) : t("N/A")}</td><td data-label={t("Rides")}>{j.rides}</td><td data-label={t("Wins")}>{j.wins}</td><td data-label={t("Win %")}>{j.win_pct}%</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "trainers" && scope === "season" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Trainer")}</th><th>{t("Stable")}</th><th>{t("Runners")}</th><th>{t("Wins")}</th><th>{t("Placed")}</th></tr></thead>
                <tbody>
                  {trainerRows.map((tr, i) => { const l = lineOf(season.trainer, tr.id); return (
                    <tr key={tr.id}><td>{i + 1}</td><td data-title>{tr.name}</td><td data-label={t("Stable")}>{tr.stable?.name ?? t("Unknown")}</td><td data-label={t("Runners")}>{l.runs}</td><td data-label={t("Wins")}>{l.wins}</td><td data-label={t("Placed")}>{l.places}</td></tr>
                  ); })}
                </tbody>
              </table>
            )}
            {tab === "trainers" && scope === "all" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Trainer")}</th><th>{t("Stable")}</th><th>{t("Horses")}</th><th>{t("Wins")}</th></tr></thead>
                <tbody>
                  {trainerRows.map((tr, i) => (
                    <tr key={tr.id} className={inactiveT(tr.id) ? "opacity-60 grayscale" : undefined}><td>{i + 1}</td><td data-title>{tr.name}{inactiveT(tr.id) && <span className="ml-2"><InactiveBadge year={year} kind="trainer" small /></span>}</td><td data-label={t("Stable")}>{tr.stable?.name ?? t("Unknown")}</td><td data-label={t("Horses")}>{tr.horses}</td><td data-label={t("Wins")}>{tr.wins}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "stables" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Stable")}</th><th>{t("Location")}</th><th>{t("Horses")}</th><th>{t("Staff")}</th></tr></thead>
                <tbody>
                  {[...stables].sort((a, b) => b.horses - a.horses).map((s, i) => (
                    <tr key={s.id}><td>{i + 1}</td><td data-title>{s.name}</td><td data-label={t("Location")}>{s.location}</td><td data-label={t("Horses")}>{s.horses}</td><td data-label={t("Staff")}>{s.staff}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
