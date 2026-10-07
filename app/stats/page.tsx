import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { getHorses } from "@/lib/horses";
import { getJockeys } from "@/lib/jockeys";
import { getTrainers } from "@/lib/trainers";
import { getStables } from "@/lib/stables";
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

export default async function StatsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const { t, lang } = getT();
  const tab = (searchParams.tab as (typeof TABS)[number][0]) || "horses";
  const [horses, jockeys, trainers, stables] = await Promise.all([
    getHorses(), getJockeys(), getTrainers(), getStables(),
  ]);

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
              <Link key={id} href={`/stats?tab=${id}`} className={`pb-2.5 pr-5 text-sm whitespace-nowrap border-b-2 ${tab === id ? "border-coral font-semibold" : "border-transparent opacity-70"}`}>
                {t(label)}
              </Link>
            ))}
          </div>
          <div className="panel">
            {tab === "horses" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Horse")}</th><th>{t("Trainer")}</th><th>{t("Starts")}</th><th>{t("Wins")}</th><th>{t("Placed")}</th><th>{t("Earnings")}</th></tr></thead>
                <tbody>
                  {[...horses].sort((a, b) => b.wins - a.wins).map((h, i) => (
                    <tr key={h.id}><td>{i + 1}</td><td data-title>{h.name}</td><td data-label={t("Trainer")}>{h.trainer?.name ?? t("Unknown")}</td><td data-label={t("Starts")}>{h.starts}</td><td data-label={t("Wins")}>{h.wins}</td><td data-label={t("Placed")}>{h.seconds + h.thirds}</td><td data-label={t("Earnings")}>{fmtMoney(h.earnings, lang)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "jockeys" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Jockey")}</th><th>{t("Nationality")}</th><th>{t("Rides")}</th><th>{t("Wins")}</th><th>{t("Win %")}</th></tr></thead>
                <tbody>
                  {[...jockeys].filter((j) => !j.apprentice).sort((a, b) => b.wins - a.wins).map((j, i) => (
                    <tr key={j.id}><td>{i + 1}</td><td data-title>{j.name}</td><td data-label={t("Nationality")}>{j.nationality ? t("nat:" + j.nationality) : t("N/A")}</td><td data-label={t("Rides")}>{j.rides}</td><td data-label={t("Wins")}>{j.wins}</td><td data-label={t("Win %")}>{j.win_pct}%</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "trainers" && (
              <table className="data-table">
                <thead><tr><th>#</th><th>{t("Trainer")}</th><th>{t("Stable")}</th><th>{t("Horses")}</th><th>{t("Wins")}</th></tr></thead>
                <tbody>
                  {[...trainers].sort((a, b) => b.wins - a.wins).map((tr, i) => (
                    <tr key={tr.id}><td>{i + 1}</td><td data-title>{tr.name}</td><td data-label={t("Stable")}>{tr.stable?.name ?? t("Unknown")}</td><td data-label={t("Horses")}>{tr.horses}</td><td data-label={t("Wins")}>{tr.wins}</td></tr>
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
