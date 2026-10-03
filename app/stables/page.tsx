import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Shirt } from "lucide-react";
import { getStables } from "@/lib/stables";
import SilkImage from "@/components/SilkImage";

export const revalidate = 0;

export default async function StablesPage() {
  const { t, lang } = getT();
  const stables = await getStables();
  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("DIRECTORY")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Stables")}</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {stables.map((s) => (
            <Link key={s.id} href={`/stables/${s.id}`} className="card">
              <div className="h-[100px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center">
                {s.silk_image_url ? (
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/25 flex items-center justify-center overflow-hidden shrink-0">
                    <SilkImage url={s.silk_image_url} size={48} title={s.name} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/25 flex items-center justify-center text-white/60 shrink-0">
                    <Shirt size={26} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-semibold truncate">{s.name}</h4>
                <div className="text-xs opacity-60 mt-1">{s.location ?? t("N/A")} · {t("Owner")}: {s.owner ?? t("Unknown")}</div>
                <div className="flex gap-3.5 mt-3 text-xs">
                  <div><b className="block font-mono text-sm">{s.horses}</b>{t("Horses")}</div>
                  <div><b className="block font-mono text-sm">{s.staff}</b>{t("Staff")}</div>
                </div>
              </div>
            </Link>
          ))}
          {stables.length === 0 && <p className="text-sm opacity-60">{t("No stables yet.")}</p>}
        </div>
      </section>
    </div>
  );
}
