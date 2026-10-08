import { GallopLoader, SkeletonLine } from "@/components/PageLoader";

export default function RaceDayLoading() {
  return (
    <div data-route-loading>
      <div className="detail-hero">
        <div className="wrap">
          <SkeletonLine w={90} h={12} className="!bg-white/20" />
          <SkeletonLine w="50%" h={30} className="mt-3 !bg-white/20" />
          <SkeletonLine w="35%" h={14} className="mt-4 !bg-white/15" />
        </div>
      </div>
      <section className="py-8">
        <div className="wrap">
          <GallopLoader label="Loading the race card…" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <SkeletonLine key={i} h={120} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
