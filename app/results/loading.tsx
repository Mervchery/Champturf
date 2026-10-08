import { GallopLoader, SkeletonLine } from "@/components/PageLoader";

export default function ResultsLoading() {
  return (
    <div data-route-loading>
      <div className="detail-hero">
        <div className="wrap">
          <SkeletonLine w={110} h={12} className="!bg-white/20" />
          <SkeletonLine w="40%" h={30} className="mt-3 !bg-white/20" />
        </div>
      </div>
      <section className="py-8">
        <div className="wrap">
          <GallopLoader label="Loading results…" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => <SkeletonLine key={i} h={200} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
