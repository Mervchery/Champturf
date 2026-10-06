import { GallopLoader, SkeletonLine } from "@/components/PageLoader";

// Shown instantly while any page without its own loading.tsx fetches data.
export default function Loading() {
  return (
    <div className="wrap py-14" data-route-loading>
      <GallopLoader />
      <div className="space-y-3 mt-2 max-w-3xl mx-auto">
        <SkeletonLine w="40%" h={22} />
        <SkeletonLine h={14} />
        <SkeletonLine w="85%" h={14} />
        <SkeletonLine h={90} className="mt-4" />
        <SkeletonLine h={90} />
      </div>
    </div>
  );
}
