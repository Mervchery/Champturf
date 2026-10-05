"use client";

import { useEffect } from "react";

/** Registers /sw.js (needed for race-day push notifications and for the app to
 *  count as installable). Renders nothing. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-fatal: the site works the same without it */
    });
  }, []);
  return null;
}
