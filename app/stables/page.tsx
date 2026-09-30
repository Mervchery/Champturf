import Link from "next/link";
import { getStables } from "@/lib/stables";
import SilkImage from "@/components/SilkImage";

export const revalidate = 0;

export default async function StablesPage() {
  const stables = await getStables();
  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">DATABASE</span>
          <h1 className="text-3xl font-display mt-1">Stables</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {stables.map((s) => (
            <Link key={s.id} href={`/stables/${s.id}`} className="card p-5 flex items-start gap-4">
              {s.silk_image_url && (
                <div className="silk-frame">
                  <SilkImage url={s.silk_image_url} size={38} title={s.name} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold truncate">{s.name}</h4>
                <div className="text-xs opacity-60 mt-1">{s.location ?? "N/A"} · Owner: {s.owner ?? "Unknown"}</div>
                <div className="flex gap-3.5 mt-3 text-xs">
                  <div><b className="block font-mono text-sm">{s.horses}</b>Horses</div>
                  <div><b className="block font-mono text-sm">{s.staff}</b>Staff</div>
                </div>
              </div>
            </Link>
          ))}
          {stables.length === 0 && <p className="text-sm opacity-60">No stables yet.</p>}
        </div>
      </section>
    </div>
  );
}
