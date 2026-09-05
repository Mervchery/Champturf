import Link from "next/link";
import { Play, Trophy, Newspaper } from "lucide-react";
import Countdown from "@/components/Countdown";
import { getRaces, getCompletedRacesWithResults } from "@/lib/races";
import { fmtMoney } from "@/lib/format";
import { getHorses } from "@/lib/horses";
import { getJockeys } from "@/lib/jockeys";
import { getNews } from "@/lib/news";

export const revalidate = 0;

export default async function HomePage() {
  const [races, completedWithResultsAll, horses, jockeys, news] = await Promise.all([
    getRaces(),
    getCompletedRacesWithResults(),
    getHorses(),
    getJockeys(),
    getNews(),
  ]);
  const upcoming = races.filter((r) => r.status === "upcoming");
  const feature = upcoming[0];
  const completedWithResults = completedWithResultsAll.slice(0, 3);

  const topHorses = [...horses].sort((a, b) => b.wins - a.wins).slice(0, 5);
  const topJockeys = [...jockeys].filter((j) => !j.apprentice).sort((a, b) => b.wins - a.wins).slice(0, 5);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-turf to-turf2 text-surface py-16 md:py-20">
        <div className="wrap grid md:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
          <div>
            <span className="text-xs font-semibold text-gold2 block mb-2.5">CHAMP DE MARS · PORT LOUIS</span>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.02]">
              The pulse of <em className="italic text-gold2">Mauritian</em>
              <br />
              turf racing.
            </h1>
            <p className="mt-4 text-base text-white/80 max-w-[46ch] leading-relaxed">
              Live results, full pedigree records, and race-day coverage for every meeting on the island — built for owners, trainers, and fans who follow the form.
            </p>
            <div className="flex gap-3 mt-7 flex-wrap">
              <Link href="/live" className="btn btn-gold"><Play size={15} /> Watch live</Link>
              <Link href="/races" className="btn btn-ghost">Race calendar</Link>
            </div>
          </div>
          {feature ? (
            <div className="bg-white/[0.06] border border-white/15 rounded backdrop-blur-md p-5">
              <span className="text-[0.7rem] font-semibold text-gold2">FEATURED RACE OF THE WEEK</span>
              <h3 className="text-white text-2xl mt-2 font-display">{feature.name}</h3>
              <div className="text-white/65 text-sm mt-1.5">
                {feature.course} · {feature.distance} · {fmtMoney(feature.prize)}
              </div>
              <Countdown target={`${feature.race_date}T${feature.race_time}`} />
            </div>
          ) : (
            <div className="bg-white/[0.06] border border-white/15 rounded backdrop-blur-md p-5">
              <span className="text-[0.7rem] font-semibold text-gold2">NO UPCOMING RACE SCHEDULED</span>
              <p className="text-white/65 text-sm mt-2">Check back soon, or add one from the admin dashboard.</p>
            </div>
          )}
        </div>
      </section>

      {/* RECENT RESULTS */}
      <section className="py-14">
        <div className="wrap">
          <div className="flex justify-between items-end mb-7 flex-wrap gap-4">
            <h2 className="font-display text-3xl">Recent results</h2>
            <Link href="/results" className="text-sm border-b border-ink pb-0.5">Full results centre →</Link>
          </div>
          {completedWithResults.length === 0 ? (
            <p className="text-sm opacity-60">No results yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {completedWithResults.map((r) => {
                const win = r.results[0];
                return (
                  <Link key={r.id} href={`/races/${r.id}`} className="card">
                    <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                      <Trophy size={32} />
                    </div>
                    <div className="p-4">
                      <span className="pill pill-coral">{r.race_date}</span>
                      <h4 className="mt-2 font-semibold">{r.name}</h4>
                      <div className="text-xs opacity-60 mt-1">
                        {win ? `Winner: ${win.horses?.name ?? "—"} — ${win.jockey}, ${win.finish_time}` : "Result pending"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* LEADERBOARDS */}
      <section className="py-14 bg-parchment2">
        <div className="wrap grid md:grid-cols-2 gap-10">
          <div>
            <div className="flex justify-between items-end mb-4">
              <h2 className="font-display text-xl">Leading horses</h2>
              <Link href="/stats" className="text-sm border-b border-ink pb-0.5">Statistics centre →</Link>
            </div>
            <div className="panel">
              {topHorses.map((h, i) => (
                <Link key={h.id} href={`/horses/${h.id}`} className="grid grid-cols-[32px_1fr_auto] gap-3.5 items-center py-3 border-b border-line last:border-0">
                  <div className="font-mono text-sm text-coral font-semibold">{i + 1}</div>
                  <div>
                    <div className="font-semibold text-sm">{h.name}</div>
                    <div className="text-xs opacity-60">{h.trainer}</div>
                  </div>
                  <div className="font-mono font-semibold text-right">{h.wins}W</div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-end mb-4">
              <h2 className="font-display text-xl">Leading jockeys</h2>
              <Link href="/stats" className="text-sm border-b border-ink pb-0.5">Statistics centre →</Link>
            </div>
            <div className="panel">
              {topJockeys.map((j, i) => (
                <Link key={j.id} href={`/jockeys/${j.id}`} className="grid grid-cols-[32px_1fr_auto] gap-3.5 items-center py-3 border-b border-line last:border-0">
                  <div className="font-mono text-sm text-coral font-semibold">{i + 1}</div>
                  <div>
                    <div className="font-semibold text-sm">{j.name}</div>
                    <div className="text-xs opacity-60">{j.nationality}</div>
                  </div>
                  <div className="font-mono font-semibold text-right">{j.wins}W</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* UPCOMING RACES */}
      <section className="py-14">
        <div className="wrap">
          <div className="flex justify-between items-end mb-7 flex-wrap gap-4">
            <h2 className="font-display text-3xl">Upcoming race days</h2>
            <Link href="/races" className="text-sm border-b border-ink pb-0.5">See calendar →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm opacity-60">No upcoming races scheduled.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {upcoming.map((r) => (
                <Link key={r.id} href={`/races/${r.id}`} className="card p-4">
                  <span className="pill pill-gold">{r.race_date}</span>
                  <h4 className="mt-2 text-sm font-semibold">{r.name}</h4>
                  <div className="text-xs opacity-60 mt-1">{r.distance} · {fmtMoney(r.prize)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* NEWS */}
      <section className="pb-14">
        <div className="wrap">
          <div className="flex justify-between items-end mb-7 flex-wrap gap-4">
            <h2 className="font-display text-3xl">Latest news</h2>
            <Link href="/news" className="text-sm border-b border-ink pb-0.5">All news →</Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {news.slice(0, 3).map((n) => (
              <div key={n.id} className="card">
                <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                  <Newspaper size={28} />
                </div>
                <div className="p-4">
                  <span className="pill">{n.category}</span>
                  <h4 className="mt-2 font-semibold">{n.title}</h4>
                  <div className="text-xs opacity-55 mt-2">{n.article_date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
