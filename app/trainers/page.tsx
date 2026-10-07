import { getT } from "@/lib/i18n/server";
import { Target } from "lucide-react";
import { getTrainers } from "@/lib/trainers";
import SilkImage from "@/components/SilkImage";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Trainers"), description: t("Mauritian racehorse trainers — runners, wins and strike rates."), path: "/trainers" });
}

export default async function TrainersPage() {
  const { t, lang } = getT();
  const trainers = await getTrainers();
  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("DIRECTORY")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Trainers")}</h1>
        </div>
      </div>
      <section className="py-10 md:py-14">
        <div className="wrap grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {trainers.map((tr) => (
            <div key={tr.id} className="card no-hover">
              <div className="h-[100px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center">
                {/* Avatar with the stable's silk as a small badge riding its
                    bottom-right edge — one integrated emblem instead of two
                    separate circles floating side by side. */}
                <div className="relative w-16 h-16 shrink-0">
                  <div className="w-full h-full rounded-full bg-white/10 border-2 border-gold2 flex items-center justify-center text-white/75 overflow-hidden">
                    {tr.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tr.photo_url} alt={tr.name} className="w-full h-full object-cover" />
                    ) : (
                      <Target size={26} />
                    )}
                  </div>
                  {tr.stable?.silk_image_url && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-turf border-2 border-[#fbf8f0] flex items-center justify-center overflow-hidden shadow-sm">
                      <SilkImage url={tr.stable.silk_image_url} size={16} title={tr.stable.name} />
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h2 className="font-semibold">{tr.name}</h2>
                <div className="text-xs opacity-70 mt-1">{tr.stable?.name ?? t("Unknown")}</div>
                <div className="flex gap-3.5 mt-3 text-xs">
                  <div><b className="block font-mono text-sm">{tr.wins}</b>{t("Wins")}</div>
                  <div><b className="block font-mono text-sm">{tr.horses}</b>{t("Horses")}</div>
                  <div><b className="block font-mono text-sm">{tr.ranking ? `#${tr.ranking}` : t("N/A")}</b>{t("Rank")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
