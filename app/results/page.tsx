import { getT } from "@/lib/i18n/server";
import { getCompletedRacesWithResults } from "@/lib/races";
import ResultsSearch from "@/components/ResultsSearch";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Results"), description: t("Race results from Champ de Mars — finishing order, times and dividends."), path: "/results" });
}

export default async function ResultsPage() {
  const { t, lang } = getT();
  const races = await getCompletedRacesWithResults();

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("RESULTS CENTRE")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Race results")}</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <ResultsSearch races={races} />
        </div>
      </section>
    </div>
  );
}
