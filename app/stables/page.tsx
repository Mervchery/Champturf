import { StableIcon } from "@/components/RacingIcons";
import { STABLES } from "@/lib/data";

export default function StablesPage() {
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
          {STABLES.map((s) => (
            <div key={s.id} className="card">
              <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                <StableIcon size={32} />
              </div>
              <div className="p-4">
                <h4 className="font-semibold">{s.name}</h4>
                <div className="text-xs opacity-60 mt-1">{s.location} · Owner: {s.owner}</div>
                <div className="flex gap-3.5 mt-3 text-xs">
                  <div><b className="block font-mono text-sm">{s.horses}</b>Horses</div>
                  <div><b className="block font-mono text-sm">{s.staff}</b>Staff</div>
                  <div><b className="block font-mono text-sm">{s.gallery}</b>Gallery</div>
                </div>
                <div className="text-xs opacity-60 mt-2.5">Trainer(s): {s.trainers.join(", ")}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
