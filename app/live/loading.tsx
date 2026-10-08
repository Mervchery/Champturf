import { GallopLoader, SkeletonLine } from "@/components/PageLoader";

export default function LiveLoading() {
  return (
    <div data-route-loading>
      <div className="detail-hero">
        <div className="wrap">
          <SkeletonLine w={90} h={12} className="!bg-white/20" />
          <SkeletonLine w="40%" h={30} className="mt-3 !bg-white/20" />
        </div>
      </div>
      <section className="py-6">
        <div className="wrap">
          <GallopLoader label="Loading the broadcast…" />
          <SkeletonLine h={220} />
          <SkeletonLine h={140} className="mt-4" />
        </div>
      </section>
    </div>
  );
}
