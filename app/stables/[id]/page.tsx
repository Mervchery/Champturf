import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStableById } from "@/lib/stables";
import { getHorses } from "@/lib/horses";
import { getTrainers } from "@/lib/trainers";
import { getCareerStatsForStable } from "@/lib/careerStats";
import SilkImage from "@/components/SilkImage";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { t } = getT();
  const st = await getStableById(params.id);
  if (!st) return { title: t("Stable not found"), robots: { index: false } };
  return pageMeta({
    title: `${st.name} — ${t("Stable profile")}`,
    description: `${st.name}: ${t("horses, trainers and results at Champ de Mars, Mauritius.")}`,
    path: `/stables/${st.id}`,
  });
}

export default async function StableDetailPage({ params }: { params: { id: string } }) {
  const { t, lang } = getT();
  const stable = await getStableById(params.id);
  if (!stable) return notFound();

  const [stats, allHorses, allTrainers] = await Promise.all([
    getCareerStatsForStable(stable.id),
    getHorses(),
    getTrainers(),
  ]);
  const horses = allHorses.filter((h) => h.stable_id === stable.id);
  const trainers = allTrainers.filter((t) => t.stable_id === stable.id);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap flex gap-6 items-center flex-wrap">
          <div className="p-2 bg-white/10 rounded-2xl border border-white/15">
            <SilkImage url={stable.silk_image_url} size={72} title={stable.name} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-gold2">{t("STABLE PROFILE")}</span>
            <h1 className="text-3xl font-display mt-1">{stable.name}</h1>
            <div className="text-white/70 text-sm mt-1.5">{stable.location ?? t("N/A")} · {t("Owner")}: {stable.owner ?? t("Unknown")}</div>
          </div>
        </div>
      </div>

      <section className="py-10 md:py-14">
        <div className="wrap">
          <Link href="/stables" className="inline-block text-sm border-b border-ink pb-1">← {t("Back to stables")}</Link>

          <h2 className="font-display text-xl mt-7 mb-4">{t("Career statistics")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="stat-tile"><div className="v">{stats.wins}</div><div className="l">{t("Total wins")}</div></div>
            <div className="stat-tile"><div className="v">{stats.places}</div><div className="l">{t("Total places")}</div></div>
            <div className="stat-tile"><div className="v">{stats.winPct}%</div><div className="l">{t("Win percentage")}</div></div>
            <div className="stat-tile"><div className="v">{stats.placePct}%</div><div className="l">{t("Place percentage")}</div></div>
            <div className="stat-tile"><div className="v">{stats.starts}</div><div className="l">{t("Total starts")}</div></div>
            <div className="stat-tile"><div className="v">{stats.avgFinish ?? t("N/A")}</div><div className="l">{t("Avg. finishing position")}</div></div>
            <div className="stat-tile"><div className="v">{stable.horses}</div><div className="l">{t("Horses")}</div></div>
            <div className="stat-tile"><div className="v">{stable.staff}</div><div className="l">{t("Staff")}</div></div>
          </div>

          {stats.recentForm.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold mb-2">{t("Recent form")}</h3>
              <div className="flex gap-2">
                {stats.recentForm.map((f, i) => <span key={i} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"}`}>{f}</span>)}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="min-w-0">
              <h2 className="font-display text-xl mb-4">{t("Horses in this stable")}</h2>
              {horses.length === 0 ? (
                <p className="text-sm opacity-70">{t("No horses currently assigned to this stable.")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {horses.map((h) => (
                    <Link key={h.id} href={`/horses/${h.id}`} className="card p-3 flex items-center gap-2.5">
                      <SilkImage fallback url={h.silk_image_url} size={26} title={h.name} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{h.name}</div>
                        <div className="text-xs opacity-70">{h.wins}{t("W")} · {h.starts} {t("starts")}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <h2 className="font-display text-xl mt-8 mb-4">{t("Trainers")}</h2>
              {trainers.length === 0 ? (
                <p className="text-sm opacity-70">{t("No trainers currently linked to this stable.")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {trainers.map((tr) => (
                    <Link key={tr.id} href={`/trainers/${tr.id}`} className="card p-3 flex items-center justify-between">
                      <span className="text-sm font-semibold">{tr.name}</span>
                      <span className="text-xs opacity-70">{tr.wins} {t("wins")}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="font-display text-xl mb-4">{t("Recent results")}</h2>
              {stats.recentResults.length === 0 ? (
                <p className="text-sm opacity-70">{t("No results recorded yet.")}</p>
              ) : (
                <div className="panel !p-0 overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>{t("Pos")}</th><th>{t("Horse")}</th><th>{t("Race")}</th><th>{t("Date")}</th></tr></thead>
                    <tbody>
                      {stats.recentResults.map((r, i) => (
                        <tr key={i}>
                          <td><span className={`pill ${r.position === 1 ? "pill-gold" : "pill-outline"}`}>{r.position}</span></td>
                          <td data-title><Link href={`/horses/${r.horseId}`} className="hover:underline">{r.horseName}</Link></td>
                          <td data-label={t("Race")}><Link href={`/races/${r.raceId}`} className="hover:underline">{r.raceName}</Link></td>
                          <td data-label={t("Date")} className="text-xs opacity-70">{r.raceDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
