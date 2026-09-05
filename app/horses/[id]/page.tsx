import Link from "next/link";
import { notFound } from "next/navigation";
import { HorseIcon } from "@/components/RacingIcons";
import { getHorseById, getRecentForm } from "@/lib/horses";
import { fmtMoney } from "@/lib/format";

export const revalidate = 0;

export default async function HorseDetailPage({ params }: { params: { id: string } }) {
  const h = await getHorseById(params.id);
  if (!h) return notFound();
  const form = await getRecentForm(h.id);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap flex gap-6 items-center flex-wrap">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-gold2 flex items-center justify-center text-gold2 shrink-0">
            <HorseIcon size={40} />
          </div>
          <div>
            <span className="text-xs font-semibold text-gold2">HORSE PROFILE</span>
            <h1 className="text-3xl font-display mt-1">{h.name}</h1>
            <div className="text-white/70 text-sm mt-1.5">
              {h.age}yo {h.sex} · {h.breed} · {h.color} · Born {h.origin}
            </div>
          </div>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <Link href="/horses" className="text-sm border-b border-ink pb-0.5">← Back to horses</Link>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-7">
            <div className="panel"><div className="text-xs opacity-60">Wins</div><div className="font-mono font-semibold text-xl">{h.wins}</div></div>
            <div className="panel"><div className="text-xs opacity-60">Placed</div><div className="font-mono font-semibold text-xl">{h.seconds + h.thirds}</div></div>
            <div className="panel"><div className="text-xs opacity-60">Starts</div><div className="font-mono font-semibold text-xl">{h.starts}</div></div>
            <div className="panel"><div className="text-xs opacity-60">Career earnings</div><div className="font-mono font-semibold text-xl">{fmtMoney(h.earnings)}</div></div>
          </div>
          <p className="text-xs opacity-50 mb-7 -mt-4">
            Stats above are computed automatically from entered race results — they can&apos;t be edited directly.
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="panel">
              <h4 className="text-sm font-semibold mb-3">Connections</h4>
              <table>
                <tbody>
                  <tr><td>Owner</td><td>{h.owner ?? "—"}</td></tr>
                  <tr><td>Trainer</td><td>{h.trainer ?? "—"}</td></tr>
                  <tr><td>Stable</td><td>{h.stable ?? "—"}</td></tr>
                  <tr><td>Medical status</td><td><span className="pill pill-gold">{h.medical_status ?? "Cleared to race"}</span></td></tr>
                </tbody>
              </table>
            </div>
            <div className="panel">
              <h4 className="text-sm font-semibold mb-3">Recent form (from entered results)</h4>
              {form.length === 0 ? (
                <p className="text-sm opacity-60">No results recorded for this horse yet.</p>
              ) : (
                <div className="flex gap-2">
                  {form.map((f, i) => (
                    <span key={i} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"}`}>{f}</span>
                  ))}
                </div>
              )}
              <h4 className="text-sm font-semibold mt-5 mb-2">Racing history</h4>
              <div className="text-sm opacity-60">Full past-performance log available in the Results Centre.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
