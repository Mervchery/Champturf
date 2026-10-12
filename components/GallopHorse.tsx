/** A racehorse and jockey at full gallop — a small skeletal rig drawn in SVG and animated with
 *  CSS (see ".gh-" rules in globals.css). Every leg is two jointed segments (shoulder/hip and
 *  knee/hock) running one shared stride cycle, offset the way a real transverse gallop is
 *  (hind, hind, fore, fore, then the airborne moment). Body bob, neck pitch, tail and mane
 *  stream follow the stride, and the ground scrolls underneath. Colours come from
 *  currentColor / CSS variables, so it suits light and dark. Pure SVG + CSS: no JS, no images. */

function Fore({ cls }: { cls: string }) {
  return (
    <g transform="translate(121 60)">
      <g className={`gh-fu ${cls}`}>
        <path d="M-5.5 -3 L5.5 -3 L3.4 19 L-3 19 Z" />
        <g transform="translate(0 19)">
          <g className={`gh-fl ${cls}`}>
            <path d="M-3 -1 L3 -1 L2.4 18 L-2.4 18 Z" />
            <path d="M-3.2 17 L3 17 L6.6 23.5 L-3.4 23.5 Z" />
          </g>
        </g>
      </g>
    </g>
  );
}

function Hind({ cls }: { cls: string }) {
  return (
    <g transform="translate(73 55)">
      <g className={`gh-hu ${cls}`}>
        <path d="M-9 -5 C-4 -8 6 -8 9 -3 L5 21 L-3.4 21 Z" />
        <g transform="translate(0 21)">
          <g className={`gh-hl ${cls}`}>
            <path d="M-3.4 -1 L3.4 -1 L2.5 20 L-2.5 20 Z" />
            <path d="M-3.4 19 L3 19 L6.6 25 L-3.6 25 Z" />
          </g>
        </g>
      </g>
    </g>
  );
}

export default function GallopHorse({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`gh ${className}`}
      width={size}
      height={size * 0.6}
      viewBox="0 0 200 120"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {/* ground shadow, squashes as the horse rises */}
      <ellipse className="gh-shadow" cx="100" cy="106" rx="46" ry="3.2" fill="currentColor" opacity="0.18" />

      <g className="gh-body">
        {/* far-side legs sit behind, slightly dimmer for depth */}
        <g opacity="0.62">
          <Hind cls="gh-p2" />
          <Fore cls="gh-p4" />
        </g>

        {/* tail */}
        <g transform="translate(60 46)">
          <g className="gh-tail">
            <path d="M3 -3 C-12 -8 -28 -3 -40 9 C-26 6 -13 9 3 7 Z" />
          </g>
        </g>

        {/* torso */}
        <path d="M60 46 C62 38 78 37 92 39 L120 40 C129 41 135 46 137 53 C138 61 133 69 124 71 L100 73 C88 73 76 71 68 65 C60 59 57 52 60 46 Z" />

        {/* neck + head, pitching about the withers */}
        <g transform="translate(124 46)">
          <g className="gh-neck">
            <path d="M-8 -6 C2 -16 12 -26 22 -32 L23 -43 L29.5 -34 C39 -29 49 -17 55 -10 C57 -7 55 -3 51 -3 C45 -4 41 -9 37 -12 C31 -10 27 -6 21 0 C15 6 8 10 -6 12 Z" />
            {/* mane streaming back */}
            <g className="gh-mane">
              <path d="M-7 -6 C4 -17 12 -27 22 -33 C14 -29 6 -22 -2 -14 C-8 -10 -12 -8 -14 -5 Z" />
            </g>
          </g>
        </g>

        {/* jockey, crouched low in the stirrups */}
        <g className="gh-jockey">
          <path d="M88 38 C92 28 102 24 112 25 L121 30 L124 36 L117 35 L108 33 C103 36 98 40 92 41 Z" />
          <path d="M112 25 L121 30 L119 34 L111 31 Z" />
          <circle cx="114" cy="21" r="5.6" />
          <path d="M108.6 20.5 C109 16.6 112 15 115.5 15.6 C119.4 16.2 121 19 120.4 22 C118 20 113 19.4 108.6 20.5 Z" opacity="0.5" />
        </g>

        {/* near-side legs */}
        <Hind cls="gh-p1" />
        <Fore cls="gh-p3" />
      </g>

      {/* speed streaks trailing the horse */}
      <g className="gh-streaks" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" opacity="0.35">
        <line x1="22" y1="50" x2="42" y2="50" />
        <line x1="10" y1="64" x2="36" y2="64" />
        <line x1="26" y1="80" x2="44" y2="80" />
      </g>

      {/* track */}
      <g className="gh-ground">
        <line x1="-60" x2="280" y1="110" y2="110" stroke="currentColor" strokeWidth="1.6" strokeDasharray="12 8" opacity="0.5" />
      </g>
    </svg>
  );
}
