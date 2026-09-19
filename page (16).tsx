import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Video } from "lucide-react";
import { getRaceById, getEntriesForRace, getResultsForRace } from "@/lib/races";
import { getRecentForm } from "@/lib/horses";
import { fmtMoney } from "@/lib/format";
import { EntryRow, ResultRow } from "@/components/RunnerCard";

export const revalidate = 0;

export default async function RaceDetailPage({ params }: { params: { id: string } }) {
  const race = await getRaceById(params.id);
  if (!race) return notFound();

  const [entries, results] = await Promise.all([
    race.status === "upcoming" ? getEntriesForRace(race.id) : Promise.resolve([]),
    race.status === "completed" ? getResultsForRace(race.id) : Promise.resolve([]),
  ]);

  // Recent form for upcoming entries, fetched per horse (small field size, cheap).
  const formByHorse: Record<string, string[]> = {};
  if (race.status === "upcoming") {
    await Promise.all(
      entries.filter((e) => e.horses).map(async (e) => {
        formByHorse[e.horses!.id] = await getRecentForm(e.horses!.id);
      })
    );
  }

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
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <Link href="/race-days" className="text-sm border-b border-ink pb-0.5">← All race days</Link>
            <Link href={`/race-days/${race.race_date}`} className="text-sm border-b border-ink pb-0.5">View full race day →</Link>
          </div>

          {race.status === "completed" ? (
            <div className="mt-8">
              <h3 className="font-display text-xl mb-4">Official result</h3>
              {results.length === 0 ? (
                <p className="text-sm opacity-60">No result has been entered for this race yet.</p>
              ) : (
                <div className="space-y-3">
                  {results.map((row) => (
                    <ResultRow
                      key={row.id}
                      number={row.position}
                      horse={row.horses}
                      jockeyName={row.jockeys?.name ?? row.jockey}
                      weight={row.weight_kg}
                      position={row.position}
                      finishTime={row.finish_time}
                      margin={row.margin}
                      startingPrice={row.starting_price}
                      performanceRating={row.performance_rating}
                      racePrize={race.prize}
                    />
                  ))}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-5 mt-8">
                <div className="panel">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Camera size={15} /> Photo finish gallery</h4>
                  <div className="h-[120px] mt-2.5 bg-gradient-to-br from-turf to-turf2 rounded-2xl flex items-center justify-center text-white/50">
                    Image
                  </div>
                </div>
                <div className="panel">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Video size={15} /> Replay video</h4>
                  <div className="h-[120px] mt-2.5 bg-gradient-to-br from-turf to-turf2 rounded-2xl flex items-center justify-center text-white/50">
                    ▶ Replay
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <h3 className="font-display text-xl mb-4">Entries &amp; starting positions</h3>
              {entries.length === 0 ? (
                <p className="text-sm opacity-60">Entries haven&apos;t been declared for this race yet.</p>
              ) : (
                <div className="space-y-3">
                  {entries.map((e) => (
                    <EntryRow
                      key={e.id}
                      number={e.runner_no ?? e.gate ?? 0}
                      horse={e.horses}
                      jockeyName={e.jockeys?.name ?? null}
                      weight={e.weight_kg}
                      gate={e.gate}
                      odds={e.odds}
                      form={e.horses ? formByHorse[e.horses.id] : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
