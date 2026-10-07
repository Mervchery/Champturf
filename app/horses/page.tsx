import { getT } from "@/lib/i18n/server";
import { getHorses } from "@/lib/horses";
import HorsesGrid from "@/components/HorsesGrid";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Horses"), description: t("Every horse racing at Champ de Mars — form, trainer, owner and career record."), path: "/horses" });
}

export default async function HorsesPage() {
  const { t, lang } = getT();
  const horses = await getHorses();

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("DIRECTORY")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Horses")}</h1>
        </div>
      </div>
      <section className="py-10 md:py-14">
        <div className="wrap">
          <HorsesGrid horses={horses} />
        </div>
      </section>
    </div>
  );
}
