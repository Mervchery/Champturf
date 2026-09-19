import Link from "next/link";
import { notFound } from "next/navigation";
import { getStableById } from "@/lib/stables";
import { getHorses } from "@/lib/horses";
import { getTrainers } from "@/lib/trainers";
import { getCareerStatsForStable } from "@/lib/careerStats";
import Silk from "@/components/Silk";

export const revalidate = 0;

export default async function StableDetailPage({ params }: { params: { id: string } }) {
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
            <Silk primary={stable.silk_primary} secondary={stable.silk_secondary} cap={stable.silk_cap} pattern={stable.silk_pattern} size={72} title={stable.name} />
          </div>
          <div>
            <span className="text-xs font-semibold text-gold2">STABLE PROFILE</span>
            <h1 className="text-3xl font-display mt-1">{stable.name}</h1>
            <div className="text-white/70 text-sm mt-1.5">{stable.location ?? "N/A"} · Owner: {stable.owner ?? "Unknown"}</div>
          </div>
        </div>
      </div>

      <section className="py-14">
        <div className="wrap">
          <Link href="/stables" className="text-sm border-b border-ink pb-0.5">← Back to stables</Link>

          <h2 className="font-display text-xl mt-7 mb-4">Career statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="stat-tile"><div className="v">{stats.wins}</div><div className="l">Total wins</div></div>
            <div className="stat-tile"><div className="v">{stats.places}</div><div className="l">Total places</div></div>
            <div className="stat-tile"><div className="v">{stats.winPct}%</div><div className="l">Win percentage</div></div>
            <div className="stat-tile"><div className="v">{stats.placePct}%</div><div className="l">Place percentage</div></div>
            <div className="stat-tile"><div className="v">{stats.starts}</div><div className="l">Total starts</div></div>
            <div className="stat-tile"><div className="v">{stats.avgFinish ?? "N/A"}</div><div className="l">Avg. finishing position</div></div>
            <div className="stat-tile"><div className="v">{stable.horses}</div><div className="l">Horses</div></div>
            <div className="stat-tile"><div className="v">{stable.staff}</div><div className="l">Staff</div></div>
          </div>

          {stats.recentForm.length > 0 && (
            <div className="mb-10">
              <h4 className="text-sm font-semibold mb-2">Recent form</h4>
              <div className="flex gap-2">
                {stats.recentForm.map((f, i) => <span key={i} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"}`}>{f}</span>)}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="font-display text-xl mb-4">Horses in this stable</h2>
              {horses.length === 0 ? (
                <p className="text-sm opacity-60">No horses currently assigned to this stable.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {horses.map((h) => (
                    <Link key={h.id} href={`/horses/${h.id}`} className="card p-3 flex items-center gap-2.5">
                      <Silk primary={stable.silk_primary} secondary={stable.silk_secondary} cap={stable.silk_cap} pattern={stable.silk_pattern} size={26} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{h.name}</div>
                        <div className="text-xs opacity-60">{h.wins}W · {h.starts} starts</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <h2 className="font-display text-xl mt-8 mb-4">Trainers</h2>
              {trainers.length === 0 ? (
                <p className="text-sm opacity-60">No trainers currently linked to this stable.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {trainers.map((t) => (
                    <Link key={t.id} href={`/trainers/${t.id}`} className="card p-3 flex items-center justify-between">
                      <span className="text-sm font-semibold">{t.name}</span>
                      <span className="text-xs opacity-60">{t.wins} wins</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="font-display text-xl mb-4">Recent results</h2>
              {stats.recentResults.length === 0 ? (
                <p className="text-sm opacity-60">No results recorded yet.</p>
              ) : (
                <div className="panel !p-0 overflow-hidden">
                  <table>
                    <thead><tr><th>Pos</th><th>Horse</th><th>Race</th><th>Date</th></tr></thead>
                    <tbody>
                      {stats.recentResults.map((r, i) => (
                        <tr key={i}>
                          <td><span className={`pill ${r.position === 1 ? "pill-gold" : "pill-outline"}`}>{r.position}</span></td>
                          <td><Link href={`/horses/${r.horseId}`} className="hover:underline">{r.horseName}</Link></td>
                          <td><Link href={`/races/${r.raceId}`} className="hover:underline">{r.raceName}</Link></td>
                          <td className="text-xs opacity-60">{r.raceDate}</td>
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
