import Link from "next/link";
import { notFound } from "next/navigation";
import { JockeyIcon } from "@/components/RacingIcons";
import { JOCKEYS } from "@/lib/data";

export function generateStaticParams() {
  return JOCKEYS.map((j) => ({ id: j.id }));
}

export default function JockeyDetailPage({ params }: { params: { id: string } }) {
  const j = JOCKEYS.find((x) => x.id === params.id);
  if (!j) return notFound();

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap flex gap-6 items-center flex-wrap">
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-gold2 flex items-center justify-center text-gold2 shrink-0">
            <JockeyIcon size={38} />
          </div>
          <div>
            <span className="text-xs font-semibold text-gold2">{j.apprentice ? "APPRENTICE JOCKEY" : "JOCKEY PROFILE"}</span>
            <h1 className="text-3xl font-display mt-1">{j.name}</h1>
            <div className="text-white/70 text-sm mt-1.5">{j.nat}</div>
          </div>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <Link href="/jockeys" className="text-sm border-b border-ink pb-0.5">← Back to jockeys</Link>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="panel"><div className="text-xs opacity-60">Wins</div><div className="font-mono font-semibold text-xl">{j.wins}</div></div>
            <div className="panel"><div className="text-xs opacity-60">Places</div><div className="font-mono font-semibold text-xl">{j.places}</div></div>
            <div className="panel"><div className="text-xs opacity-60">Win %</div><div className="font-mono font-semibold text-xl">{j.winPct}%</div></div>
            <div className="panel"><div className="text-xs opacity-60">Suspensions</div><div className="font-mono font-semibold text-xl">{j.suspensions ?? 0}</div></div>
          </div>

          {j.apprentice ? (
            <div className="panel mt-6">
              <h4 className="text-sm font-semibold mb-3">Apprenticeship</h4>
              <table>
                <tbody>
                  <tr><td>Mentor trainer</td><td>{j.mentor}</td></tr>
                  <tr><td>Apprentice allowance</td><td>{j.allowance}</td></tr>
                  <tr><td>Progress report</td><td>{j.progress}</td></tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel mt-6">
              <h4 className="text-sm font-semibold mb-2">Biography</h4>
              <p className="text-sm opacity-70">{j.bio}</p>
              <h4 className="text-sm font-semibold mt-4 mb-1">Achievements</h4>
              <p className="text-sm opacity-70">{j.achievements}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
