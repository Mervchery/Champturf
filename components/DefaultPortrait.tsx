import { ICON_PATHS, KIND_ICON } from "@/lib/portraitIcons";

type Kind = keyof typeof KIND_ICON;

/** Default image for a horse (saddle), jockey (jockey on horse), trainer (binoculars) or stable
 *  (horse in stall) that has no photo. One consistent icon per kind; the colours come from CSS
 *  variables (--dp-*, see globals.css) so it switches between a light and a dark variant with the
 *  site theme — no JS, no flash. Icons: game-icons.net (Lorc, Delapouite & contributors), CC BY 3.0,
 *  credited in the footer. Fills its container (centered), so it works as a card header or
 *  inside a round / rounded-square avatar. */
export default function DefaultPortrait({ kind, className = "w-full h-full" }: { kind: Kind; seed?: string; className?: string }) {
  const S = 0.15; // 512 → ~77px inside the 120 box
  return (
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className={`dp ${className}`} role="img" aria-label={kind} focusable="false">
      <rect className="dp-bg" width="120" height="120" />
      <circle className="dp-ring" cx="60" cy="60" r="43" fill="none" strokeWidth="1" />
      <g className="dp-glyph" transform={`translate(${60 - 256 * S} ${60 - 256 * S}) scale(${S})`}>
        <path d={ICON_PATHS[KIND_ICON[kind]]} />
      </g>
    </svg>
  );
}
