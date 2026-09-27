"use client";

import { useState } from "react";

// Displays the actual silk artwork — scraped per-horse from supertote.mu
// (see scraper/lib/parseRacePage.mjs) or set by hand for a stable (see
// AdminDashboard.tsx) — rather than a generated approximation.
//
// Renders nothing (not a placeholder) when there's no url, or when the
// image fails to load — an empty slot reads better here than a broken-image
// icon or a fake generic silk standing in for a real one.
//
// Routed through /api/silk-proxy: some silk hosts block a plain cross-origin
// <img> request (it works pasted into a browser tab, just not hotlinked),
// so the proxy re-fetches server-side with browser-like headers instead.
export default function SilkImage({ url, size = 34, title, className }: { url?: string | null; size?: number; title?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <img
      src={`/api/silk-proxy?url=${encodeURIComponent(url)}`}
      alt={title ? `${title} silk` : "Silk"}
      title={title}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}
