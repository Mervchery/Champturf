import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import DefaultPortrait from "@/components/DefaultPortrait";
import { getJockeys } from "@/lib/jockeys";
import { getSeasonBoard, bySeason, lineOf } from "@/lib/season";
import InactiveBadge from "@/components/InactiveBadge";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Jockeys"), description: t("Jockeys and apprentices riding in Mauritius — wins, rides and results."), path: "/jockeys" });
}

export default async function JockeysPage({ searchParams }: { searchParams: { tab?: string } }) {
  const { t, lang } = getT();
  const tab = searchParams.tab === "apprentice" ? "apprentice" : "pro";
  const [jockeys, season] = await Promise.all([getJockeys(), getSeasonBoard()]);
  const all = jockeys.filter((j) => (tab === "apprentice" ? j.apprentice : !j.apprentice));
  // Jockeys who rode this season first (season championship order); the rest follow, greyed out.
  const isActive = (id: string) => !season.available || season.activeJockeys.has(id);
  const list = season.available
    ? [...bySeason(all.filter((j) => isActive(j.id)), season.jockey), ...[...all.filter((j) => !isActive(j.id))].sort((a, b) => b.wins - a.wins)]
    : all;

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("DIRECTORY")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Jockeys & apprentices")}</h1>
        </div>
      </div>
      <section className="py-10 md:py-14">
        <div className="wrap">
          {season.available && <p className="text-xs opacity-70 -mt-3 mb-4">{t("{y} season — wins and rides this year only")}</p>}
          <div className="flex gap-1 border-b border-line mb-7">
            <Link href="/jockeys?tab=pro" className={`pb-2.5 pr-5 text-sm border-b-2 ${tab === "pro" ? "border-coral font-semibold" : "border-transparent opacity-70"}`}>
              {t("Professional")}
            </Link>
            <Link href="/jockeys?tab=apprentice" className={`pb-2.5 pr-5 text-sm border-b-2 ${tab === "apprentice" ? "border-coral font-semibold" : "border-transparent opacity-70"}`}>
              {t("Apprentice / trainee")}
            </Link>
          </div>
          {list.length === 0 && <p className="text-sm opacity-70">{t("None yet.")}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {list.map((j) => {
              const active = isActive(j.id);
              const s = lineOf(season.jockey, j.id);
              const wins = season.available ? s.wins : j.wins;
              const rate = season.available ? (s.runs > 0 ? Math.round((s.wins / s.runs) * 1000) / 10 : 0) : j.win_pct;
              return (
              <Link key={j.id} href={`/jockeys/${j.id}`} className={`card ${active ? "" : "grayscale opacity-60"}`}>
                <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 relative overflow-hidden">
                  <DefaultPortrait kind="jockey" seed={j.name} />
                </div>
                <div className="p-4">
                  <h2 className="font-semibold">{j.name}</h2>
                  {!active && <div className="mt-1"><InactiveBadge year={season.ctx.year} kind="jockey" small /></div>}
                  <div className="text-xs opacity-70 mt-1">{j.nationality ? t("nat:" + j.nationality) : ""}{j.apprentice ? ` · ${t("Apprentice")} (${j.allowance})` : ""}</div>
                  <div className="flex gap-3.5 mt-3 text-xs">
                    <div><b className="block font-mono text-sm">{active ? wins : j.wins}</b>{active ? t("Wins") : t("Career wins")}</div>
                    <div><b className="block font-mono text-sm">{active ? rate : j.win_pct}%</b>{t("Win rate")}</div>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
