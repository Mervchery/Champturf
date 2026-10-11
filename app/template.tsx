"use client";

import { useState } from "react";

// Unlike layout.tsx, a template re-mounts on every navigation — which is what
// lets each page fade/slide in instead of snapping.
// The animation kind (push / pop / tab / swipe) is read ONCE, when this page mounts, and baked
// into its class. (Driving it from a live <html> attribute made the page you were leaving
// replay its animation the instant a link was tapped — a visible blink.)
export default function Template({ children }: { children: React.ReactNode }) {
  const [kind] = useState(() => (typeof document === "undefined" ? "" : document.documentElement.dataset.nav ?? ""));
  return <div className={`page-enter${kind ? ` nav-${kind}` : ""}`}>{children}</div>;
}
