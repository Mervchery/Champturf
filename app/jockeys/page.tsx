import Link from "next/link";
import { JockeyIcon } from "@/components/RacingIcons";
import { JOCKEYS } from "@/lib/data";

export default function JockeysPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "apprentice" ? "apprentice" : "pro";
  const list = JOCKEYS.filter((j) => (tab === "apprentice" ? j.apprentice : !j.apprentice));

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">DATABASE</span>
          <h1 className="text-3xl font-display mt-1">Jockeys &amp; apprentices</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <div className="flex gap-1 border-b border-line mb-7">
            <Link href="/jockeys?tab=pro" className={`pb-2.5 pr-5 text-sm border-b-2 ${tab === "pro" ? "border-coral font-semibold" : "border-transparent opacity-55"}`}>
              Professional
            </Link>
            <Link href="/jockeys?tab=apprentice" className={`pb-2.5 pr-5 text-sm border-b-2 ${tab === "apprentice" ? "border-coral font-semibold" : "border-transparent opacity-55"}`}>
              Apprentice / trainee
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {list.map((j) => (
              <Link key={j.id} href={`/jockeys/${j.id}`} className="card">
                <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                  <JockeyIcon size={34} />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold">{j.name}</h4>
                  <div className="text-xs opacity-60 mt-1">{j.nat}{j.apprentice ? ` · Apprentice (${j.allowance})` : ""}</div>
                  <div className="flex gap-3.5 mt-3 text-xs">
                    <div><b className="block font-mono text-sm">{j.wins}</b>Wins</div>
                    <div><b className="block font-mono text-sm">{j.winPct}%</b>Win rate</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
