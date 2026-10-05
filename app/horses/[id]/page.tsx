import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HorseIcon } from "@/components/RacingIcons";
import { getHorseById, getRecentFormDetailed } from "@/lib/horses";
import { fmtMoney } from "@/lib/format";
import SilkImage from "@/components/SilkImage";
import FollowButton from "@/components/FollowButton";
import { getFollowState } from "@/lib/follows";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { t } = getT();
  const h = await getHorseById(params.id);
  if (!h) return { title: t("Horse not found"), robots: { index: false } };
  const bits = [
    h.age ? `${h.age}yo` : null,
    h.sex ? t(h.sex) : null,
    h.trainer ? `${t("Trainer")}: ${h.trainer.name}` : null,
  ].filter(Boolean).join(" · ");
  return pageMeta({
    title: `${h.name} — ${t("Horse profile")}`,
    description: `${h.name}${bits ? ` (${bits})` : ""}. ${t("Wins")}: ${h.wins}, ${t("Starts")}: ${h.starts}. ${t("Form, race history and odds movement at Champ de Mars, Mauritius.")}`,
    path: `/horses/${h.id}`,
  });
}

export default async function HorseDetailPage({ params }: { params: { id: string } }) {
  const { t, lang } = getT();
  const h = await getHorseById(params.id);
  if (!h) return notFound();
  const [formHistory, follow] = await Promise.all([getRecentFormDetailed(h.id), getFollowState()]);
  const form = formHistory.map((f) => String(f.position));

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap flex gap-6 items-center flex-wrap">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-gold2 flex items-center justify-center text-gold2 shrink-0 overflow-hidden relative">
            {h.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.photo_url} alt={h.name} className="w-full h-full object-cover" />
            ) : (
              <HorseIcon size={40} />
            )}
            {h.silk_image_url && (
              <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 shadow-md">
                <SilkImage fallback url={h.silk_image_url} size={26} title={h.name} />
              </div>
            )}
          </div>
          <div>
            <span className="text-xs font-semibold text-gold2">{t("HORSE PROFILE")}</span>
            <h1 className="text-3xl font-display mt-1">{h.name}</h1>
            <div className="text-white/70 text-sm mt-1.5">
              {h.age ? t("{n}yo", { n: h.age }) : t("N/A")} {h.sex ? t(h.sex) : t("N/A")} · {h.breed ?? t("N/A")} · {h.color ? t(h.color) : t("N/A")} · {t("Born")} {h.origin ?? t("N/A")}
            </div>
            {h.rating != null && <span className="pill pill-gold mt-2 inline-block">{t("Rating")} {h.rating}</span>}
            <div className="mt-4">
              <FollowButton horseId={h.id} horseName={h.name} initialFollowing={follow.ids.has(h.id)} signedIn={follow.signedIn} />
            </div>
          </div>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <Link href="/horses" className="text-sm border-b border-ink pb-0.5">← {t("Back to horses")}</Link>

          <h2 className="font-display text-xl mt-7 mb-4">{t("Career record")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <div className="stat-tile"><div className="v">{h.wins}</div><div className="l">{t("Wins")}</div></div>
            <div className="stat-tile"><div className="v">{h.seconds + h.thirds}</div><div className="l">{t("Places")}</div></div>
            <div className="stat-tile"><div className="v">{h.starts}</div><div className="l">{t("Starts")}</div></div>
            <div className="stat-tile"><div className="v">{fmtMoney(h.earnings, lang)}</div><div className="l">{t("Career earnings")}</div></div>
          </div>
          <div className="mb-10" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <div className="panel min-w-0">
              <h4 className="text-sm font-semibold mb-3">{t("Connections")}</h4>
              <table>
                <tbody>
                  <tr><td>{t("Owner")}</td><td>{h.owner ? <Link href="/owners" className="font-semibold hover:underline">{h.owner.name}</Link> : t("Unknown")}</td></tr>
                  <tr><td>{t("Trainer")}</td><td>{h.trainer ? <Link href={`/trainers/${h.trainer.id}`} className="font-semibold hover:underline">{h.trainer.name}</Link> : t("Unknown")}</td></tr>
                  <tr><td>{t("Stable")}</td><td>{h.stable ? <Link href={`/stables/${h.stable.id}`} className="font-semibold hover:underline">{h.stable.name}</Link> : t("Unknown")}</td></tr>
                  <tr><td>{t("Medical status")}</td><td><span className="pill pill-gold">{h.medical_status ? t(h.medical_status) : t("N/A")}</span></td></tr>
                </tbody>
              </table>
            </div>
            <div className="panel">
              <h4 className="text-sm font-semibold mb-3">{t("Recent form")}</h4>
              {form.length === 0 ? (
                <p className="text-sm opacity-60">{t("No results recorded for this horse yet.")}</p>
              ) : (
                <div className="flex gap-2">
                  {form.map((f, i) => (
                    <span key={i} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"}`}>{f}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <h2 className="font-display text-xl mb-4">{t("Race history")}</h2>
          {formHistory.length === 0 ? (
            <p className="text-sm opacity-60">{t("No races recorded for this horse yet.")}</p>
          ) : (
            <div className="panel !p-0 overflow-hidden">
              <table>
                <thead><tr><th>{t("Pos")}</th><th>{t("Race")}</th><th>{t("Date")}</th></tr></thead>
                <tbody>
                  {formHistory.map((f, i) => (
                    <tr key={i}>
                      <td><span className={`pill ${f.position === 1 ? "pill-gold" : "pill-outline"}`}>{f.position}</span></td>
                      <td><Link href={`/races/${f.raceId}`} className="hover:underline">{f.raceName}</Link></td>
                      <td className="text-xs opacity-60">{f.raceDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
