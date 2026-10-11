import { ICON_PATHS, ICON_SETS } from "@/lib/portraitIcons";

type Kind = "horse" | "jockey" | "trainer";

// Solid tiles the icon sits on. Which tile and which icon a name gets is derived from the name, so
// the same horse / jockey / trainer always shows the same picture, while a list of them without
// photos isn't one image repeated.
const TILES = [
  { top: "#235a47", bottom: "#123c2e", glyph: "#f3e9c9", ring: "#e4c878" }, // turf green
  { top: "#efe6cf", bottom: "#ddd0b0", glyph: "#2c3b34", ring: "#b99339" }, // sand
  { top: "#34322c", bottom: "#1d1c18", glyph: "#e8cd82", ring: "#e8cd82" }, // charcoal + gold
  { top: "#1f4c63", bottom: "#12303f", glyph: "#f3e9c9", ring: "#e4c878" }, // deep blue
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Icon stand-in for a missing photo: a professionally drawn equestrian glyph (game-icons.net,
 *  CC BY 3.0 — credited in the footer) on a soft gradient tile with a thin ring. Fills its
 *  container (centered), so it works as a card header or inside a round avatar. */
export default function DefaultPortrait({ kind, seed = "", className = "w-full h-full" }: { kind: Kind; seed?: string; className?: string }) {
  const h = hash(seed + kind);
  const tile = TILES[h % TILES.length];
  const names = ICON_SETS[kind];
  const d = ICON_PATHS[names[(h >>> 3) % names.length]];
  const gid = `dp${h.toString(36)}`;
  const S = 0.15; // 512 → ~77px inside the 120 box
  return (
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={kind} focusable="false">
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tile.top} />
          <stop offset="1" stopColor={tile.bottom} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#${gid}-bg)`} />
      <circle cx="60" cy="60" r="43" fill="none" stroke={tile.ring} strokeOpacity="0.28" strokeWidth="1" />
      <g transform={`translate(${60 - 256 * S} ${60 - 256 * S}) scale(${S})`} fill={tile.glyph}>
        <path d={d} />
      </g>
    </svg>
  );
}
