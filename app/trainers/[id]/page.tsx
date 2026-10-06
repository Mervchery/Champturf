import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Target, User } from "lucide-react";
import { getTrainerById } from "@/lib/trainers";
import { getHorses } from "@/lib/horses";
import { getCareerStatsForTrainer } from "@/lib/careerStats";
import SilkImage from "@/components/SilkImage";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { t } = getT();
  const tr = await getTrainerById(params.id);
  if (!tr) return { title: t("Trainer not found"), robots: { index: false } };
  return pageMeta({
    title: `${tr.name} — ${t("Trainer profile")}`,
    description: `${tr.name}: ${t("career record, runners and results at Champ de Mars, Mauritius.")}`,
    path: `/trainers/${tr.id}`,
  });
}

export default async function TrainerDetailPage({ params }: { params: { id: string } }) {
  const { t, lang } = getT();
  const trainer = await getTrainerById(params.id);
  if (!trainer) return notFound();

  const [stats, allHorses] = await Promise.all([
    getCareerStatsForTrainer(trainer.id),
    getHorses(),
  ]);
  const horses = allHorses.filter((h) => h.trainer_id === trainer.id);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap flex gap-6 items-center flex-wrap">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-gold2 flex items-center justify-center text-gold2 shrink-0 overflow-hidden">
            {trainer.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trainer.photo_url} alt={trainer.name} className="w-full h-full object-cover" />
            ) : (
              <Target size={38} />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-gold2">{t("TRAINER PROFILE")}</span>
            <h1 className="text-3xl font-display mt-1">{trainer.name}</h1>
            <div className="text-white/70 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
              {trainer.stable ? (
                <>
                  <SilkImage url={trainer.stable.silk_image_url} size={22} title={trainer.stable.name} />
                  <Link href={`/stables/${trainer.stable.id}`} className="hover:underline">{trainer.stable.name}</Link>
                </>
              ) : t("Unknown stable")}
              {trainer.ranking && <span className="pill pill-gold ml-2">{t("Ranked")} #{trainer.ranking}</span>}
            </div>
          </div>
        </div>
      </div>

      <section className="py-14">
        <div className="wrap">
          <Link href="/trainers" className="inline-block text-sm border-b border-ink pb-1">← {t("Back to trainers")}</Link>

          <h2 className="font-display text-xl mt-7 mb-4">{t("Career statistics")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="stat-tile"><div className="v">{trainer.wins}</div><div className="l">{t("Total wins")}</div></div>
            <div className="stat-tile"><div className="v">{stats.places}</div><div className="l">{t("Total places")}</div></div>
            <div className="stat-tile"><div className="v">{stats.winPct}%</div><div className="l">{t("Win percentage")}</div></div>
            <div className="stat-tile"><div className="v">{stats.placePct}%</div><div className="l">{t("Place percentage")}</div></div>
            <div className="stat-tile"><div className="v">{stats.starts}</div><div className="l">{t("Total starts")}</div></div>
            <div className="stat-tile"><div className="v">{stats.avgFinish ?? t("N/A")}</div><div className="l">{t("Avg. finishing position")}</div></div>
            <div className="stat-tile"><div className="v">{trainer.horses}</div><div className="l">{t("Horses in stable")}</div></div>
            <div className="stat-tile"><div className="v">{trainer.ranking ? `#${trainer.ranking}` : t("N/A")}</div><div className="l">{t("Current ranking")}</div></div>
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
              <h2 className="font-display text-xl mb-4">{t("Horses currently trained")}</h2>
              {horses.length === 0 ? (
                <p className="text-sm opacity-70">{t("No horses currently assigned to this trainer.")}</p>
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
            </div>

            <div className="min-w-0">
              <h2 className="font-display text-xl mb-4">{t("Recent results")}</h2>
              {stats.recentResults.length === 0 ? (
                <p className="text-sm opacity-70">{t("No results recorded yet.")}</p>
              ) : (
                <div className="panel !p-0 overflow-x-auto">
                  <table>
                    <thead><tr><th>{t("Pos")}</th><th>{t("Horse")}</th><th>{t("Race")}</th><th>{t("Date")}</th></tr></thead>
                    <tbody>
                      {stats.recentResults.map((r, i) => (
                        <tr key={i}>
                          <td><span className={`pill ${r.position === 1 ? "pill-gold" : "pill-outline"}`}>{r.position}</span></td>
                          <td><Link href={`/horses/${r.horseId}`} className="hover:underline">{r.horseName}</Link></td>
                          <td><Link href={`/races/${r.raceId}`} className="hover:underline">{r.raceName}</Link></td>
                          <td className="text-xs opacity-70">{r.raceDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {trainer.achievements && (
            <div className="panel mt-8">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><User size={15} /> {t("Achievements")}</h3>
              <p className="text-sm opacity-70">{trainer.achievements}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
