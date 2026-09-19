import Link from "next/link";
import { Target } from "lucide-react";
import { getTrainers } from "@/lib/trainers";
import Silk from "@/components/Silk";

export const revalidate = 0;

export default async function TrainersPage() {
  const trainers = await getTrainers();
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
          {trainers.map((t) => (
            <Link key={t.id} href={`/trainers/${t.id}`} className="card">
              <div className="h-[100px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center gap-3">
                {t.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.photo_url} alt={t.name} className="w-14 h-14 rounded-full object-cover border-2 border-gold2" />
                ) : (
                  <Target size={26} className="text-white/60" />
                )}
                {t.stable && <Silk primary={t.stable.silk_primary} secondary={t.stable.silk_secondary} cap={t.stable.silk_cap} pattern={t.stable.silk_pattern} size={30} title={t.stable.name} />}
              </div>
              <div className="p-4">
                <h4 className="font-semibold">{t.name}</h4>
                <div className="text-xs opacity-60 mt-1">{t.stable?.name ?? "Unknown"}</div>
                <div className="flex gap-3.5 mt-3 text-xs">
                  <div><b className="block font-mono text-sm">{t.wins}</b>Wins</div>
                  <div><b className="block font-mono text-sm">{t.horses}</b>Horses</div>
                  <div><b className="block font-mono text-sm">{t.ranking ? `#${t.ranking}` : "N/A"}</b>Rank</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
