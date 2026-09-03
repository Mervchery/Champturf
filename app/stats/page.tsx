import Link from "next/link";
import { HORSES, JOCKEYS, TRAINERS, STABLES, fmtMoney } from "@/lib/data";

const TABS = [
  ["horses", "Leading horses"],
  ["jockeys", "Leading jockeys"],
  ["trainers", "Leading trainers"],
  ["stables", "Leading stables"],
] as const;

export default function StatsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = (searchParams.tab as (typeof TABS)[number][0]) || "horses";

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">DATA</span>
          <h1 className="text-3xl font-display mt-1">Statistics centre</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <div className="flex gap-1 border-b border-line mb-7 overflow-x-auto">
            {TABS.map(([id, label]) => (
              <Link key={id} href={`/stats?tab=${id}`} className={`pb-2.5 pr-5 text-sm whitespace-nowrap border-b-2 ${tab === id ? "border-coral font-semibold" : "border-transparent opacity-55"}`}>
                {label}
              </Link>
            ))}
          </div>
          <div className="panel">
            {tab === "horses" && (
              <table>
                <thead><tr><th>#</th><th>Horse</th><th>Trainer</th><th>Starts</th><th>Wins</th><th>Places</th><th>Earnings</th></tr></thead>
                <tbody>
                  {[...HORSES].sort((a, b) => b.wins - a.wins).map((h, i) => (
                    <tr key={h.id}><td>{i + 1}</td><td>{h.name}</td><td>{h.trainer}</td><td>{h.starts}</td><td>{h.wins}</td><td>{h.places}</td><td>{fmtMoney(h.earnings)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "jockeys" && (
              <table>
                <thead><tr><th>#</th><th>Jockey</th><th>Nationality</th><th>Rides</th><th>Wins</th><th>Win %</th></tr></thead>
                <tbody>
                  {[...JOCKEYS].filter((j) => !j.apprentice).sort((a, b) => b.wins - a.wins).map((j, i) => (
                    <tr key={j.id}><td>{i + 1}</td><td>{j.name}</td><td>{j.nat}</td><td>{j.rides}</td><td>{j.wins}</td><td>{j.winPct}%</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "trainers" && (
              <table>
                <thead><tr><th>#</th><th>Trainer</th><th>Stable</th><th>Horses</th><th>Wins</th></tr></thead>
                <tbody>
                  {[...TRAINERS].sort((a, b) => b.wins - a.wins).map((t, i) => (
                    <tr key={t.id}><td>{i + 1}</td><td>{t.name}</td><td>{t.stable}</td><td>{t.horses}</td><td>{t.wins}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "stables" && (
              <table>
                <thead><tr><th>#</th><th>Stable</th><th>Location</th><th>Horses</th><th>Staff</th></tr></thead>
                <tbody>
                  {[...STABLES].sort((a, b) => b.horses - a.horses).map((s, i) => (
                    <tr key={s.id}><td>{i + 1}</td><td>{s.name}</td><td>{s.location}</td><td>{s.horses}</td><td>{s.staff}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
