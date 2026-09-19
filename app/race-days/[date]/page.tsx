import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { getMeetingInfo } from "@/lib/meetings";
import { getRacesForDate } from "@/lib/races";
import { fmtMoney } from "@/lib/format";

export const revalidate = 0;

export default async function RaceDayPage({ params }: { params: { date: string } }) {
  const [races, meeting] = await Promise.all([
    getRacesForDate(params.date),
    getMeetingInfo(params.date),
  ]);

  if (races.length === 0) return notFound();

  const dateLabel = new Date(params.date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const totalPrize = races.reduce((sum, r) => sum + (r.prize ?? 0), 0);
  const featured = [...races].sort((a, b) => b.prize - a.prize)[0];

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">RACE DAY</span>
          <h1 className="text-3xl font-display mt-1">{dateLabel}</h1>
          <div className="text-white/70 text-sm mt-2">{meeting?.course ?? races[0].course}</div>
        </div>
      </div>

      <section className="py-10">
        <div className="wrap">
          <Link href="/race-days" className="text-sm border-b border-ink pb-0.5">← All race days</Link>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-10">
            <div className="stat-tile"><div className="v">{races.length}</div><div className="l">Races</div></div>
            <div className="stat-tile"><div className="v">{fmtMoney(totalPrize)}</div><div className="l">Total prize money</div></div>
            <div className="stat-tile"><div className="v">{meeting?.weather ?? "N/A"}</div><div className="l">Weather</div></div>
            <div className="stat-tile"><div className="v">{meeting?.track_condition ?? "N/A"}</div><div className="l">Track condition</div></div>
          </div>

          {featured && (
            <div className="panel mb-10 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-gold2 flex items-center justify-center shrink-0">
                <Trophy size={20} className="text-ink" />
              </div>
              <div>
                <span className="text-xs font-semibold opacity-60">FEATURED RACE</span>
                <div className="font-display text-lg leading-snug">{featured.name}</div>
                <div className="text-xs opacity-60 mt-0.5">{featured.distance} · {fmtMoney(featured.prize)}</div>
              </div>
            </div>
          )}

          <h2 className="font-display text-2xl mb-5">Races on this card</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {races.map((r, i) => (
              <Link key={r.id} href={`/races/${r.id}`} className="card p-5 flex items-center gap-4">
                <div className="runner-number !w-10 !h-10 !text-sm shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`pill ${r.status === "upcoming" ? "pill-gold" : "pill-outline"}`}>{r.race_time}</span>
                    {r.status === "completed" && <span className="pill">Result in</span>}
                  </div>
                  <div className="font-display text-base mt-1.5 truncate">{r.name}</div>
                  <div className="text-xs opacity-60 mt-0.5">{r.distance} · {fmtMoney(r.prize)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
