"use client";

import { useId } from "react";

export type SilkPattern = "plain" | "hoops" | "stripes" | "quarters" | "spots" | "sash" | "chevron";

export type SilkProps = {
  primary?: string;
  secondary?: string;
  cap?: string;
  pattern?: SilkPattern;
  size?: number;
  title?: string;
  className?: string;
};

// Pure SVG — no raster assets, so it scales perfectly at any size on any
// screen density. One component covers every silk on the site; pass the
// stable's own colors/pattern (or nothing, for the neutral default used
// when a horse has no stable assigned yet).
export default function Silk({
  primary = "#123C2E",
  secondary = "#E4C878",
  cap = "#123C2E",
  pattern = "hoops",
  size = 40,
  title,
  className = "",
}: SilkProps) {
  const uid = useId().replace(/:/g, "");
  const jacketId = `silk-jacket-${uid}`;
  const hoopsId = `silk-hoops-${uid}`;
  const stripesId = `silk-stripes-${uid}`;
  const spotsId = `silk-spots-${uid}`;

  const JACKET_PATH = "M32,30 L68,30 L74,46 L70,100 L30,100 L26,46 Z";
  const LEFT_SLEEVE = "M20,35 L32,30 L34,54 L18,58 Z";
  const RIGHT_SLEEVE = "M80,35 L68,30 L66,54 L82,58 Z";

  return (
    <svg
      viewBox="0 0 100 110"
      width={size}
      height={size * 1.1}
      className={className}
      role="img"
      aria-label={title ?? "Racing silk"}
    >
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={jacketId}>
          <path d={JACKET_PATH} />
        </clipPath>
        <pattern id={hoopsId} width="10" height="12" patternUnits="userSpaceOnUse">
          <rect width="10" height="6" y="0" fill={secondary} />
          <rect width="10" height="6" y="6" fill={primary} />
        </pattern>
        <pattern id={stripesId} width="12" height="10" patternUnits="userSpaceOnUse">
          <rect width="6" height="10" x="0" fill={secondary} />
          <rect width="6" height="10" x="6" fill={primary} />
        </pattern>
        <pattern id={spotsId} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={primary} />
          <circle cx="4" cy="4" r="2.4" fill={secondary} />
          <circle cx="12" cy="12" r="2.4" fill={secondary} />
        </pattern>
      </defs>

      {/* Sleeves — solid secondary, a common real-world silk convention */}
      <path d={LEFT_SLEEVE} fill={secondary} stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
      <path d={RIGHT_SLEEVE} fill={secondary} stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />

      {/* Jacket body — filled according to pattern */}
      <g clipPath={`url(#${jacketId})`}>
        {pattern === "plain" && <rect x="0" y="0" width="100" height="110" fill={primary} />}

        {pattern === "hoops" && <rect x="0" y="0" width="100" height="110" fill={`url(#${hoopsId})`} />}

        {pattern === "stripes" && <rect x="0" y="0" width="100" height="110" fill={`url(#${stripesId})`} />}

        {pattern === "spots" && <rect x="0" y="0" width="100" height="110" fill={`url(#${spotsId})`} />}

        {pattern === "quarters" && (
          <>
            <rect x="0" y="0" width="100" height="110" fill={primary} />
            <rect x="49" y="0" width="51" height="55" fill={secondary} />
            <rect x="0" y="55" width="50" height="55" fill={secondary} />
          </>
        )}

        {pattern === "sash" && (
          <>
            <rect x="0" y="0" width="100" height="110" fill={primary} />
            <polygon points="20,30 40,30 80,100 60,100" fill={secondary} />
          </>
        )}

        {pattern === "chevron" && (
          <>
            <rect x="0" y="0" width="100" height="110" fill={primary} />
            <polygon points="50,40 78,100 62,100 50,72 38,100 22,100" fill={secondary} />
          </>
        )}
      </g>

      {/* Jacket outline */}
      <path d={JACKET_PATH} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />

      {/* Cap */}
      <circle cx="50" cy="14" r="13" fill={cap} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
    </svg>
  );
}
