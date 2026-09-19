import Link from "next/link";
import { notFound } from "next/navigation";
import { HorseIcon } from "@/components/RacingIcons";
import { getHorseById, getRecentFormDetailed } from "@/lib/horses";
import { fmtMoney } from "@/lib/format";
import Silk from "@/components/Silk";

export const revalidate = 0;

export default async function HorseDetailPage({ params }: { params: { id: string } }) {
  const h = await getHorseById(params.id);
  if (!h) return notFound();
  const formHistory = await getRecentFormDetailed(h.id);
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
            {h.stable && (
              <div className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 shadow-md">
                <Silk primary={h.stable.silk_primary} secondary={h.stable.silk_secondary} cap={h.stable.silk_cap} pattern={h.stable.silk_pattern} size={26} title={h.stable.name} />
              </div>
            )}
          </div>
          <div>
            <span className="text-xs font-semibold text-gold2">HORSE PROFILE</span>
            <h1 className="text-3xl font-display mt-1">{h.name}</h1>
            <div className="text-white/70 text-sm mt-1.5">
              {h.age ? `${h.age}yo` : "N/A"} {h.sex ?? "N/A"} · {h.breed ?? "N/A"} · {h.color ?? "N/A"} · Born {h.origin ?? "N/A"}
            </div>
            {h.rating != null && <span className="pill pill-gold mt-2 inline-block">Rating {h.rating}</span>}
          </div>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <Link href="/horses" className="text-sm border-b border-ink pb-0.5">← Back to horses</Link>

          <h2 className="font-display text-xl mt-7 mb-4">Career record</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <div className="stat-tile"><div className="v">{h.wins}</div><div className="l">Wins</div></div>
            <div className="stat-tile"><div className="v">{h.seconds + h.thirds}</div><div className="l">Places</div></div>
            <div className="stat-tile"><div className="v">{h.starts}</div><div className="l">Starts</div></div>
            <div className="stat-tile"><div className="v">{fmtMoney(h.earnings)}</div><div className="l">Career earnings</div></div>
          </div>
          <p className="text-xs opacity-50 mb-10">
            Stats above are computed automatically from entered race results — they can&apos;t be edited directly.
          </p>

          <div className="grid md:grid-cols-2 gap-5 mb-10">
            <div className="panel">
              <h4 className="text-sm font-semibold mb-3">Connections</h4>
              <table>
                <tbody>
                  <tr><td>Owner</td><td>{h.owner ? <Link href="/owners" className="font-semibold hover:underline">{h.owner.name}</Link> : "Unknown"}</td></tr>
                  <tr><td>Trainer</td><td>{h.trainer ? <Link href={`/trainers/${h.trainer.id}`} className="font-semibold hover:underline">{h.trainer.name}</Link> : "Unknown"}</td></tr>
                  <tr><td>Stable</td><td>{h.stable ? <Link href={`/stables/${h.stable.id}`} className="font-semibold hover:underline">{h.stable.name}</Link> : "Unknown"}</td></tr>
                  <tr><td>Medical status</td><td><span className="pill pill-gold">{h.medical_status ?? "N/A"}</span></td></tr>
                </tbody>
              </table>
            </div>
            <div className="panel">
              <h4 className="text-sm font-semibold mb-3">Recent form</h4>
              {form.length === 0 ? (
                <p className="text-sm opacity-60">No results recorded for this horse yet.</p>
              ) : (
                <div className="flex gap-2">
                  {form.map((f, i) => (
                    <span key={i} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"}`}>{f}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <h2 className="font-display text-xl mb-4">Race history</h2>
          {formHistory.length === 0 ? (
            <p className="text-sm opacity-60">No races recorded for this horse yet.</p>
          ) : (
            <div className="panel !p-0 overflow-hidden">
              <table>
                <thead><tr><th>Pos</th><th>Race</th><th>Date</th></tr></thead>
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
