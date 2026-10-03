"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type State = "idle" | "loading" | "done";

/** Thin gold bar across the top: starts the moment an internal link is
 *  clicked and finishes when the new page's route is in place. */
export default function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<State>("idle");

  // Route changed → finish the bar, then reset.
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    const t = setTimeout(() => setState("idle"), 600);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setState("loading");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Safety net: never leave the bar hanging if a navigation is cancelled.
  useEffect(() => {
    if (state !== "loading") return;
    const t = setTimeout(() => setState("idle"), 10000);
    return () => clearTimeout(t);
  }, [state]);

  return <div className="nav-progress" data-state={state} aria-hidden="true" />;
}
