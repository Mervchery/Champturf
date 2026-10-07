import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { JockeyIcon } from "@/components/RacingIcons";
import { getJockeys } from "@/lib/jockeys";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Jockeys"), description: t("Jockeys and apprentices riding in Mauritius — wins, rides and results."), path: "/jockeys" });
}

export default async function JockeysPage({ searchParams }: { searchParams: { tab?: string } }) {
  const { t, lang } = getT();
  const tab = searchParams.tab === "apprentice" ? "apprentice" : "pro";
  const jockeys = await getJockeys();
  const list = jockeys.filter((j) => (tab === "apprentice" ? j.apprentice : !j.apprentice));

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
            {list.map((j) => (
              <Link key={j.id} href={`/jockeys/${j.id}`} className="card">
                <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/75">
                  <JockeyIcon size={34} />
                </div>
                <div className="p-4">
                  <h2 className="font-semibold">{j.name}</h2>
                  <div className="text-xs opacity-70 mt-1">{j.nationality ? t("nat:" + j.nationality) : ""}{j.apprentice ? ` · ${t("Apprentice")} (${j.allowance})` : ""}</div>
                  <div className="flex gap-3.5 mt-3 text-xs">
                    <div><b className="block font-mono text-sm">{j.wins}</b>{t("Wins")}</div>
                    <div><b className="block font-mono text-sm">{j.win_pct}%</b>{t("Win rate")}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
