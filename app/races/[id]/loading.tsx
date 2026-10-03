import { GallopLoader, RunnerSkeleton, SkeletonLine } from "@/components/PageLoader";

export default function RaceLoading() {
  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <SkeletonLine w={120} h={12} className="!bg-white/20" />
          <SkeletonLine w="55%" h={30} className="mt-3 !bg-white/20" />
          <SkeletonLine w="70%" h={14} className="mt-4 !bg-white/15" />
        </div>
      </div>
      <section className="py-10">
        <div className="wrap">
          <GallopLoader label="Loading runners…" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <RunnerSkeleton key={i} index={i} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
