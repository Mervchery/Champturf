"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, startTransition } from "react";
import { useT } from "@/components/LanguageProvider";

type Props = {
  /** Seconds between refreshes. null/undefined = nothing to refresh, render nothing. */
  intervalSec?: number | null;
  /** Show the small "Live · updated hh:mm:ss" chip (default true). */
  showStatus?: boolean;
  className?: string;
};

/** Keeps a server-rendered page current: every few seconds it asks Next to re-render the
 *  route on the server (router.refresh) and swaps the new data in, keeping scroll position
 *  and client state. It pauses while the tab is hidden or the device is offline, and
 *  catches up the moment the visitor comes back. */
export default function LiveRefresh({ intervalSec, showStatus = true, className = "" }: Props) {
  const router = useRouter();
  const { t, lang } = useT();
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    if (!intervalSec) return;
    lastRef.current = Date.now();
    setUpdatedAt(Date.now());
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (navigator.onLine === false) { setOffline(true); return; }
      setOffline(false);
      lastRef.current = Date.now();
      startTransition(() => router.refresh());
      setUpdatedAt(Date.now());
    };

    const id = setInterval(refresh, intervalSec * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRef.current > intervalSec * 1000) refresh();
    };
    const onOnline = () => { setOffline(false); refresh(); };
    const onOffline = () => setOffline(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [intervalSec, router]);

  if (!intervalSec || !showStatus) return null;

  const time = updatedAt != null
    ? new Date(updatedAt).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  return (
    <span className={`live-chip ${offline ? "is-offline" : ""} ${className}`} role="status" aria-live="off">
      <span className="live-dot" aria-hidden="true" />
      {offline ? t("Offline — will resume") : t("Live · updates automatically")}
      {!offline && time && <span className="opacity-70 tabular-nums">· {time}</span>}
    </span>
  );
}
