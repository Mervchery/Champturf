import { GallopLoader, SkeletonLine } from "@/components/PageLoader";

export default function HorseLoading() {
  return (
    <div data-route-loading>
      <div className="detail-hero">
        <div className="wrap flex gap-6 items-center">
          <div className="skeleton rounded-full shrink-0 !bg-white/20" style={{ width: 96, height: 96 }} />
          <div className="flex-1">
            <SkeletonLine w={100} h={12} className="!bg-white/20" />
            <SkeletonLine w="50%" h={28} className="mt-3 !bg-white/20" />
            <SkeletonLine w="70%" h={14} className="mt-3 !bg-white/15" />
          </div>
        </div>
      </div>
      <section className="py-8">
        <div className="wrap">
          <GallopLoader label="Loading the form…" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <SkeletonLine key={i} h={72} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
