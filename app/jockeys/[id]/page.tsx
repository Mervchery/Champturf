import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JockeyIcon } from "@/components/RacingIcons";
import { getJockeyById } from "@/lib/jockeys";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { t } = getT();
  const j = await getJockeyById(params.id);
  if (!j) return { title: t("Jockey not found"), robots: { index: false } };
  return pageMeta({
    title: `${j.name} — ${j.apprentice ? t("Apprentice jockey") : t("Jockey profile")}`,
    description: `${j.name}: ${t("career record, rides and results at Champ de Mars, Mauritius.")}`,
    path: `/jockeys/${j.id}`,
  });
}

export default async function JockeyDetailPage({ params }: { params: { id: string } }) {
  const { t, lang } = getT();
  const j = await getJockeyById(params.id);
  if (!j) return notFound();

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap flex gap-6 items-center flex-wrap">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-gold2 flex items-center justify-center text-gold2 shrink-0">
            <JockeyIcon size={38} />
          </div>
          <div>
            <span className="text-xs font-semibold text-gold2">{j.apprentice ? t("APPRENTICE JOCKEY") : t("JOCKEY PROFILE")}</span>
            <h1 className="text-3xl font-display mt-1">{j.name}</h1>
            <div className="text-white/70 text-sm mt-1.5">{j.nationality ? t("nat:" + j.nationality) : t("N/A")}</div>
          </div>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <Link href="/jockeys" className="text-sm border-b border-ink pb-0.5">← {t("Back to jockeys")}</Link>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="panel"><div className="text-xs opacity-60">{t("Wins")}</div><div className="font-mono font-semibold text-xl">{j.wins}</div></div>
            <div className="panel"><div className="text-xs opacity-60">{t("Places")}</div><div className="font-mono font-semibold text-xl">{j.places}</div></div>
            <div className="panel"><div className="text-xs opacity-60">{t("Win %")}</div><div className="font-mono font-semibold text-xl">{j.win_pct}%</div></div>
            <div className="panel"><div className="text-xs opacity-60">{t("Suspensions")}</div><div className="font-mono font-semibold text-xl">{j.suspensions}</div></div>
          </div>

          {j.apprentice ? (
            <div className="panel mt-6">
              <h4 className="text-sm font-semibold mb-3">{t("Apprenticeship")}</h4>
              <table>
                <tbody>
                  <tr><td>{t("Mentor jockey")}</td><td>{j.mentor ? <Link href={`/jockeys/${j.mentor.id}`} className="font-semibold">{j.mentor.name}</Link> : t("Unknown")}</td></tr>
                  <tr><td>{t("Apprentice allowance")}</td><td>{j.allowance ?? t("N/A")}</td></tr>
                  <tr><td>{t("Progress report")}</td><td>{j.progress ?? t("N/A")}</td></tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel mt-6">
              <h4 className="text-sm font-semibold mb-2">{t("Biography")}</h4>
              <p className="text-sm opacity-70">{j.bio ?? t("N/A")}</p>
              <h4 className="text-sm font-semibold mt-4 mb-1">{t("Achievements")}</h4>
              <p className="text-sm opacity-70">{j.achievements ?? t("N/A")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
