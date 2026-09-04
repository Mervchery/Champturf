import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Video } from "lucide-react";
import { getRaceById, getEntriesForRace, getResultsForRace, fmtMoney } from "@/lib/races";

export const revalidate = 0;

export default async function RaceDetailPage({ params }: { params: { id: string } }) {
  const race = await getRaceById(params.id);
  if (!race) return notFound();

  const [entries, results] = await Promise.all([
    race.status === "upcoming" ? getEntriesForRace(race.id) : Promise.resolve([]),
    race.status === "completed" ? getResultsForRace(race.id) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{race.status.toUpperCase()} · {race.course}</span>
          <h1 className="text-3xl font-display mt-1">{race.name}</h1>
          <div className="text-white/70 text-sm mt-2">
            {race.race_date} · {race.race_time} · {race.distance} · {fmtMoney(race.prize)}
            {race.conditions ? ` · ${race.conditions}` : ""}
          </div>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <Link href="/races" className="text-sm border-b border-ink pb-0.5">← Back to calendar</Link>

          {race.status === "completed" ? (
            <div className="mt-6">
              <h3 className="font-display text-xl mb-4">Official result</h3>
              {results.length === 0 ? (
                <p className="text-sm opacity-60">No result has been entered for this race yet.</p>
              ) : (
                <div className="panel">
                  <table>
                    <thead><tr><th>Pos</th><th>Horse</th><th>Jockey</th><th>Time</th></tr></thead>
                    <tbody>
                      {results.map((row) => (
                        <tr key={row.id}>
                          <td>{row.position}</td>
                          <td>{row.horse_name}</td>
                          <td>{row.jockey}</td>
                          <td className="font-mono">{row.finish_time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-5 mt-6">
                <div className="panel">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Camera size={15} /> Photo finish gallery</h4>
                  <div className="h-[120px] mt-2.5 bg-gradient-to-br from-turf to-turf2 rounded flex items-center justify-center text-white/50">
                    Image
                  </div>
                </div>
                <div className="panel">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Video size={15} /> Replay video</h4>
                  <div className="h-[120px] mt-2.5 bg-gradient-to-br from-turf to-turf2 rounded flex items-center justify-center text-white/50">
                    Replay
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <h3 className="font-display text-xl mb-4">Entries &amp; starting positions</h3>
              {entries.length === 0 ? (
                <p className="text-sm opacity-60">Entries haven&apos;t been declared for this race yet.</p>
              ) : (
                <div className="panel">
                  <table>
                    <thead><tr><th>Gate</th><th>Horse</th><th>Trainer</th></tr></thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id}>
                          <td>{e.gate ?? "—"}</td>
                          <td className="font-semibold">{e.horse_name}</td>
                          <td>{e.trainer ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
