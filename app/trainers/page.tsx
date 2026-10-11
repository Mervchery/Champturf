import { getT } from "@/lib/i18n/server";
import { Target } from "lucide-react";
import { getTrainers } from "@/lib/trainers";
import { getSeasonBoard, bySeason, lineOf } from "@/lib/season";
import InactiveBadge from "@/components/InactiveBadge";
import SilkImage from "@/components/SilkImage";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Trainers"), description: t("Mauritian racehorse trainers — runners, wins and strike rates."), path: "/trainers" });
}

export default async function TrainersPage() {
  const { t, lang } = getT();
  const [all, season] = await Promise.all([getTrainers(), getSeasonBoard()]);
  const isActive = (id: string) => !season.available || season.activeTrainers.has(id);
  // Trainers with runners this season first, in season championship order; the rest follow, greyed out.
  const ranked = season.available ? bySeason(all.filter((x) => isActive(x.id)), season.trainer) : all;
  const rankOf = new Map(ranked.map((x, i) => [x.id, i + 1]));
  const trainers = season.available ? [...ranked, ...all.filter((x) => !isActive(x.id)).sort((a, b) => b.wins - a.wins)] : all;
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
          {season.available && <p className="col-span-full text-xs opacity-70 -mt-3">{t("{y} season — wins and runners this year only")}</p>}
          {trainers.map((tr) => {
            const active = isActive(tr.id);
            const s = lineOf(season.trainer, tr.id);
            return (
            <div key={tr.id} className={`card no-hover ${active ? "" : "grayscale opacity-60"}`}>
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
                {!active && <div className="mt-1"><InactiveBadge year={season.ctx.year} kind="trainer" small /></div>}
                <div className="text-xs opacity-70 mt-1">{tr.stable?.name ?? t("Unknown")}</div>
                <div className="flex gap-3.5 mt-3 text-xs">
                  <div><b className="block font-mono text-sm">{season.available ? (active ? s.wins : tr.wins) : tr.wins}</b>{season.available && !active ? t("Career wins") : t("Wins")}</div>
                  <div><b className="block font-mono text-sm">{season.available ? (active ? s.runs : tr.horses) : tr.horses}</b>{season.available && active ? t("Runners") : t("Horses")}</div>
                  <div><b className="block font-mono text-sm">{season.available ? (active ? `#${rankOf.get(tr.id)}` : "—") : (tr.ranking ? `#${tr.ranking}` : t("N/A"))}</b>{t("Rank")}</div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
