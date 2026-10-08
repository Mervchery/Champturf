"use client";

import { useSyncExternalStore } from "react";

export type RaceStatusInfo = {
  live: boolean;
  /** Date of the meeting the site is currently "about" (YYYY-MM-DD), if any. */
  date: string | null;
  next: { id: string; date: string; time: string } | null;
};

const EMPTY: RaceStatusInfo = { live: false, date: null, next: null };

// One shared poller for the whole app: the header and the mobile tab bar both read the
// same state, so a visitor makes ONE request every 30 s however many components listen.
let current: RaceStatusInfo = EMPTY;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function load() {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  try {
    const res = await fetch("/api/race-status", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    const next: RaceStatusInfo = { live: !!json.live, date: json.date ?? null, next: json.next ?? null };
    if (next.live !== current.live || next.date !== current.date || next.next?.id !== current.next?.id) {
      current = next;
      listeners.forEach((l) => l());
    }
  } catch {
    /* offline or blocked — keep the last known state */
  }
}

const onVisible = () => { if (document.visibilityState === "visible") load(); };

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    load();
    timer = setInterval(load, 30000);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

/** Polls /api/race-status (cheap, CDN-cached) so the nav can show a LIVE dot and link
 *  straight to the current race day. */
export function useRaceStatus(): RaceStatusInfo {
  return useSyncExternalStore(subscribe, () => current, () => EMPTY);
}
