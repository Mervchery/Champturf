"use client";

import { useEffect, useState } from "react";

/** A ticking "now" for client components. The first render uses the server's
 *  timestamp so server and client markup match; it then follows the device clock. */
export function useNow(serverNow: number, intervalMs = 1000): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}
