import { getHorses } from "@/lib/horses";
import HorsesGrid from "@/components/HorsesGrid";

export const revalidate = 0;

export default async function HorsesPage() {
  const horses = await getHorses();

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">DATABASE</span>
          <h1 className="text-3xl font-display mt-1">Horses</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <HorsesGrid horses={horses} />
        </div>
      </section>
    </div>
  );
}
