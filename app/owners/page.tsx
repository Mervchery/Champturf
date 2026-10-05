import { getT } from "@/lib/i18n/server";
import { User } from "lucide-react";
import { getOwners } from "@/lib/owners";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Owners"), description: t("Racehorse owners at Champ de Mars — horses owned and winnings."), path: "/owners" });
}

export default async function OwnersPage() {
  const { t, lang } = getT();
  const owners = await getOwners();
  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("DIRECTORY")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Owners")}</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {owners.map((o) => (
            <div key={o.id} className="card">
              <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                <User size={30} />
              </div>
              <div className="p-4">
                <h4 className="font-semibold">{o.name}</h4>
                <div className="flex gap-3.5 mt-3 text-xs">
                  <div><b className="block font-mono text-sm">{o.horses}</b>{t("Horses")}</div>
                  <div><b className="block font-mono text-sm">{o.wins}</b>{t("Career wins")}</div>
                </div>
                <div className="text-xs opacity-60 mt-2.5">{o.achievements ?? t("N/A")}</div>
              </div>
            </div>
          ))}
          {owners.length === 0 && <p className="text-sm opacity-60">{t("No owners yet.")}</p>}
        </div>
      </section>
    </div>
  );
}
