"use client";

import { useEffect, useRef, useState } from "react";

// Supertote's own placeholder, shown on their site for runners without silk
// artwork (it's the <img src="/images/silk-404.png"> fallback inside their
// silk <object> tag) — so a horse with no silk looks the same here as there.
const SUPERTOTE_DEFAULT_SILK = "https://supertote.mu/images/silk-404.png";

// Last-resort silk, drawn inline, in case even Supertote's placeholder can't
// be fetched. Never fails, never needs the network.
function DefaultSilkSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" style={{ opacity: 0.55 }}>
      <circle cx="20" cy="6" r="3.2" fill="currentColor" />
      <path d="M13 11h14l7 6-3.5 5-3.5-2.5V35H13V19.5L9.5 22 6 17l7-6Z" fill="currentColor" fillOpacity={0.18} stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M20 11v24" stroke="currentColor" strokeWidth={1.2} strokeOpacity={0.5} />
    </svg>
  );
}

type Stage = "primary" | "default" | "svg";

type Props = {
  url?: string | null;
  size?: number;
  title?: string;
  className?: string;
  // Horses show a default silk when theirs is missing/broken (matching
  // Supertote). Stable/other silks leave this off and render nothing instead.
  fallback?: boolean;
};

// Displays the actual silk artwork — scraped per-horse from supertote.mu
// (see scraper/lib/parseRacePage.mjs) or set by hand for a stable.
//
// Routed through /api/silk-proxy: some silk hosts block a plain cross-origin
// <img> request, so the proxy re-fetches server-side with browser-like headers.
//
// While loading, a soft shimmer holds the space; the image then fades in so
// lists don't pop.
function SilkInner({ url, size = 34, title, className, fallback = false }: Props) {
  const initial: Stage = url ? "primary" : fallback ? "default" : "svg";
  const [stage, setStage] = useState<Stage>(initial);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // An image that was already cached/finished before hydration never fires onLoad.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) {
      if (img.naturalWidth > 0) setLoaded(true);
      else advance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function advance() {
    setLoaded(false);
    setStage((s) => (s === "primary" ? (fallback ? "default" : "svg") : "svg"));
  }

  const wrapStyle = { width: size, height: size };

  if (stage === "svg") {
    if (!fallback) return null; // stable silks: an empty slot beats a fake silk
    return <span className={`silk-wrap ${className ?? ""}`} style={wrapStyle} title={title}><DefaultSilkSvg size={size} /></span>;
  }

  const target = stage === "primary" ? url! : SUPERTOTE_DEFAULT_SILK;
  const isRemote = /^https?:\/\//i.test(target);
  const src = isRemote ? `/api/silk-proxy?url=${encodeURIComponent(target)}` : target;

  return (
    <span className={`silk-wrap ${loaded ? "" : "skeleton"} ${className ?? ""}`} style={wrapStyle}>
      <img
        ref={imgRef}
        key={stage}
        src={src}
        alt={title ? `${title} silk` : "Silk"}
        title={title}
        width={size}
        height={size}
        className="silk-img"
        style={{ width: size, height: size, opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={advance}
      />
    </span>
  );
}

// Keyed by url so a changed url restarts the fallback chain from the top.
export default function SilkImage(props: Props) {
  return <SilkInner key={props.url ?? "none"} {...props} />;
}
