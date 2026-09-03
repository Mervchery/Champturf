import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Video } from "lucide-react";
import { RACES, horseById, fmtMoney } from "@/lib/data";

export function generateStaticParams() {
  return RACES.map((r) => ({ id: r.id }));
}

export default function RaceDetailPage({ params }: { params: { id: string } }) {
  const race = RACES.find((r) => r.id === params.id);
  if (!race) return notFound();

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{race.status.toUpperCase()} · {race.course}</span>
          <h1 className="text-3xl font-display mt-1">{race.name}</h1>
          <div className="text-white/70 text-sm mt-2">
            {race.date} · {race.time} · {race.distance} · {fmtMoney(race.prize)} · {race.conditions}
          </div>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <Link href="/races" className="text-sm border-b border-ink pb-0.5">← Back to calendar</Link>

          {race.result ? (
            <div className="mt-6">
              <h3 className="font-display text-xl mb-4">Official result</h3>
              <div className="panel">
                <table>
                  <thead>
                    <tr><th>Pos</th><th>Horse</th><th>Jockey</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {race.result.map((row) => (
                      <tr key={row.pos}>
                        <td>{row.pos}</td>
                        <td>{horseById(row.horse)?.name}</td>
                        <td>{row.jockey}</td>
                        <td className="font-mono">{row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="panel">
                <table>
                  <thead>
                    <tr><th>Gate</th><th>Horse</th><th>Trainer</th><th>Recent form</th></tr>
                  </thead>
                  <tbody>
                    {race.entries.map((hid, i) => {
                      const h = horseById(hid)!;
                      return (
                        <tr key={hid}>
                          <td>{i + 1}</td>
                          <td><Link href={`/horses/${h.id}`} className="font-semibold">{h.name}</Link></td>
                          <td>{h.trainer}</td>
                          <td className="flex gap-1.5 flex-wrap">
                            {h.form.map((f, idx) => (
                              <span key={idx} className={`pill ${f === "1" ? "pill-gold" : "pill-outline"}`}>{f}</span>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
