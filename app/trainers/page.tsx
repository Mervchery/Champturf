import { Target } from "lucide-react";
import { TRAINERS } from "@/lib/data";

export default function TrainersPage() {
  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">DATABASE</span>
          <h1 className="text-3xl font-display mt-1">Trainers</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap grid grid-cols-2 md:grid-cols-4 gap-5">
          {TRAINERS.map((t) => (
            <div key={t.id} className="card">
              <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                <Target size={30} />
              </div>
              <div className="p-4">
                <h4 className="font-semibold">{t.name}</h4>
                <div className="text-xs opacity-60 mt-1">{t.stable}</div>
                <div className="flex gap-3.5 mt-3 text-xs">
                  <div><b className="block font-mono text-sm">{t.wins}</b>Wins</div>
                  <div><b className="block font-mono text-sm">{t.horses}</b>Horses</div>
                  <div><b className="block font-mono text-sm">#{t.ranking}</b>Rank</div>
                </div>
                <div className="text-xs opacity-60 mt-2.5">{t.achievements}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
