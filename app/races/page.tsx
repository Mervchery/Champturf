import Link from "next/link";
import { RACES, fmtMoney } from "@/lib/data";

export default function RacesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "completed" ? "completed" : "upcoming";
  const list = RACES.filter((r) => r.status === tab);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">RACE MANAGEMENT</span>
          <h1 className="text-3xl font-display mt-1">Race calendar</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <div className="flex gap-1 border-b border-line mb-7">
            <Link href="/races?tab=upcoming" className={`pb-2.5 pr-5 text-sm border-b-2 ${tab === "upcoming" ? "border-coral font-semibold" : "border-transparent opacity-55"}`}>
              Upcoming
            </Link>
            <Link href="/races?tab=completed" className={`pb-2.5 pr-5 text-sm border-b-2 ${tab === "completed" ? "border-coral font-semibold" : "border-transparent opacity-55"}`}>
              Completed
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {list.map((r) => (
              <Link key={r.id} href={`/races/${r.id}`} className="card p-4">
                <span className={`pill ${r.status === "upcoming" ? "pill-gold" : ""}`}>{r.date}</span>
                <h4 className="mt-2 font-semibold">{r.name}</h4>
                <div className="text-xs opacity-60 mt-1">{r.course} · {r.distance} · {fmtMoney(r.prize)}</div>
                <div className="text-xs opacity-60 mt-1">{r.conditions}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
