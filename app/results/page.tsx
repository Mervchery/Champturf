import { getCompletedRacesWithResults } from "@/lib/races";
import ResultsSearch from "@/components/ResultsSearch";

export const revalidate = 0;

export default async function ResultsPage() {
  const races = await getCompletedRacesWithResults();

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">RESULTS CENTRE</span>
          <h1 className="text-3xl font-display mt-1">Race results</h1>
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
