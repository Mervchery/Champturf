import { HorseIcon } from "@/components/RacingIcons";
import { getT } from "@/lib/i18n/server";

/** Galloping-horse indicator used by the route loading screens. */
export function GallopLoader({ label = "Loading the field…" }: { label?: string }) {
  const { t } = getT();
  return (
    <div className="flex flex-col items-center gap-1 py-8" role="status" aria-live="polite">
      <div className="loader-track">
        <HorseIcon size={32} className="loader-horse" />
        <div className="loader-ground" />
      </div>
      <span className="text-xs opacity-60">{t(label)}</span>
    </div>
  );
}

export function SkeletonLine({ w = "100%", h = 12, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ width: w, height: h }} />;
}

/** Placeholder with the same shape as a runner card, so the page doesn't jump when data arrives. */
export function RunnerSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="runner-row" style={{ "--delay": `${index * 70}ms` } as React.CSSProperties} aria-hidden="true">
      <div className="runner-head">
        <div className="runner-rail">
          <div className="skeleton rounded-full" style={{ width: 28, height: 28 }} />
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
        </div>
        <div className="flex-1 min-w-0">
          <SkeletonLine w="55%" h={16} />
          <SkeletonLine w="22%" h={10} className="mt-2" />
        </div>
      </div>
      <div className="people-grid">
        <SkeletonLine h={30} />
        <SkeletonLine h={30} />
      </div>
      <SkeletonLine h={44} className="mt-3" />
      <div className="odds-row">
        <SkeletonLine h={38} />
        <SkeletonLine h={38} />
      </div>
    </div>
  );
}
