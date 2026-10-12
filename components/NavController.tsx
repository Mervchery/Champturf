"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Where the app's "tab roots" live. A page is a *root* when it is one of these; anything else is
 *  a pushed detail screen (shows a back button, supports edge-swipe back). */
export const ROOT_PATHS = ["/", "/race-days", "/horses", "/jockeys", "/trainers", "/stables", "/owners", "/news", "/stats", "/results", "/live"];
export const isRootPath = (p: string) => ROOT_PATHS.includes(p);

const IDX_KEY = "__ctIdx";
const LAST_KEY = "ct:last-by-tab";

/** Which bottom tab a path belongs to (null = none, e.g. Horses opened from More). */
export function tabOf(path: string): "home" | "raceday" | "results" | "live" | null {
  if (path === "/") return "home";
  if (path.startsWith("/race-days") || path.startsWith("/races")) return "raceday";
  if (path.startsWith("/results")) return "results";
  if (path.startsWith("/live")) return "live";
  return null;
}

export function rememberTabPath(tab: string, path: string) {
  try {
    const all = JSON.parse(sessionStorage.getItem(LAST_KEY) || "{}");
    all[tab] = path;
    sessionStorage.setItem(LAST_KEY, JSON.stringify(all));
  } catch { /* private mode: tabs simply open at their root */ }
}
export function recallTabPath(tab: string): string | null {
  try { return JSON.parse(sessionStorage.getItem(LAST_KEY) || "{}")[tab] ?? null; } catch { return null; }
}

/** How the next page should animate. Read by CSS through <html data-nav="…">. */
export type NavKind = "push" | "pop" | "tab" | "swipe";
let kindAt = 0;
export function setNavKind(kind: NavKind) {
  document.documentElement.dataset.nav = kind;
  kindAt = Date.now();
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Behind-the-scenes navigation brain:
 *  - stamps every history entry with an index, so back vs forward is known (push slides in from
 *    the right, back slides in from the left) and the header can tell if there is anywhere to go back to;
 *  - remembers the last page opened inside each bottom tab;
 *  - in the installed (Home Screen) app, where there is no browser chrome, adds the iOS
 *    swipe-from-the-left-edge gesture to go back. */
export default function NavController() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // 1) History index + direction.
  useEffect(() => {
    const h = window.history;
    const readIdx = () => (typeof h.state?.[IDX_KEY] === "number" ? (h.state[IDX_KEY] as number) : 0);
    let last = readIdx();
    // Stamp the entry we landed on.
    try { h.replaceState({ ...(h.state || {}), [IDX_KEY]: last }, "", location.href); } catch { /* ignore */ }

    const push = h.pushState.bind(h);
    const replace = h.replaceState.bind(h);
    h.pushState = (state: unknown, title: string, url?: string | URL | null) => {
      last = readIdx() + 1;
      // A navigation nobody classified (e.g. router.push after a search) is a plain push.
      if (Date.now() - kindAt > 800) setNavKind("push");
      push({ ...((state as object) || {}), [IDX_KEY]: last }, title, url);
      window.dispatchEvent(new Event("ct:nav-idx"));
    };
    h.replaceState = (state: unknown, title: string, url?: string | URL | null) => {
      // Next.js re-writes the state on its own; keep our index on it.
      replace({ ...((state as object) || {}), [IDX_KEY]: readIdx() }, title, url);
    };
    const onPop = () => {
      const now = readIdx();
      const root = document.documentElement;
      // A swipe-back already animated itself out; leave its marker alone.
      if (root.dataset.nav !== "swipe") setNavKind(now < last ? "pop" : "push");
      last = now;
      window.dispatchEvent(new Event("ct:nav-idx"));
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      h.pushState = push;
      h.replaceState = replace;
    };
  }, []);

  // 2) Link taps decide the animation before the route changes.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      // Links inside a tab bar / menu are lateral moves, everything else drills in.
      setNavKind(a.closest(".tabbar, .sheet-panel") ? "tab" : "push");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 3) Remember where each tab was, and clear any swipe offset once the new page is in.
  useEffect(() => {
    const tab = tabOf(pathname);
    if (tab) rememberTabPath(tab, pathname + location.search);
    const main = document.querySelector("main") as HTMLElement | null;
    if (main) { main.style.transition = ""; main.style.transform = ""; main.style.boxShadow = ""; }
  }, [pathname]);

  // 3b) Header gains a soft shadow once the page has scrolled (data-scrolled on <html>).
  useEffect(() => {
    const root = document.documentElement;
    let on = false;
    const onScroll = () => {
      const now = window.scrollY > 6;
      if (now !== on) { on = now; if (now) root.dataset.scrolled = ""; else delete root.dataset.scrolled; }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 3c) Cards / panels below the fold rise into place as they scroll into view.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        io.unobserve(el);
        el.classList.add("rv-in");
        // Hand the element back to its normal styles (hover lift etc.) once settled.
        timers.push(setTimeout(() => { el.classList.remove("rv", "rv-in"); el.style.removeProperty("--rv-d"); }, 900));
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    const start = requestAnimationFrame(() => {
      const vh = window.innerHeight;
      let n = 0;
      document.querySelectorAll<HTMLElement>("main .card, main .panel, main .stat-tile").forEach((el) => {
        if (el.closest("[data-route-loading]") || el.closest("[data-no-reveal]")) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh + 24) return; // already on screen: leave it alone
        el.classList.add("rv");
        el.style.setProperty("--rv-d", `${(n++ % 3) * 70}ms`); // small stagger across a row
        io.observe(el);
      });
    });
    // Safety net: never leave anything hidden.
    const safety = setTimeout(() => document.querySelectorAll(".rv").forEach((el) => el.classList.add("rv-in")), 4000);
    return () => { cancelAnimationFrame(start); clearTimeout(safety); timers.forEach(clearTimeout); io.disconnect(); };
  }, [pathname]);

  // 4) Edge-swipe back (installed app only).
  useEffect(() => {
    if (!isStandalone()) return;
    const main = document.querySelector("main") as HTMLElement | null;
    if (!main) return;

    let startX = 0, startY = 0, startT = 0, dx = 0;
    let mode: "idle" | "pending" | "drag" = "idle";

    const canGoBack = () => {
      const idx = typeof history.state?.[IDX_KEY] === "number" ? (history.state[IDX_KEY] as number) : 0;
      return idx > 0 && !isRootPath(location.pathname) && !document.body.style.overflow;
    };

    function start(e: TouchEvent) {
      if (e.touches.length !== 1 || e.touches[0].clientX > 24 || !canGoBack()) return;
      // Only listen for moves during an edge touch: a document-wide non-passive touchmove
      // listener would make every normal scroll wait on JS (janky, esp. with sticky bars).
      document.addEventListener("touchmove", move, { passive: false });
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; startT = Date.now(); dx = 0;
      mode = "pending";
    }
    function move(e: TouchEvent) {
      if (mode === "idle") return;
      const x = e.touches[0].clientX - startX;
      const y = e.touches[0].clientY - startY;
      if (mode === "pending") {
        if (Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) { mode = "idle"; return; } // it's a scroll
        if (x < 8) return;
        mode = "drag";
        main!.style.transition = "none";
      }
      if (e.cancelable) e.preventDefault();
      dx = Math.max(0, x);
      main!.style.transform = `translate3d(${dx}px,0,0)`;
      main!.style.boxShadow = "-12px 0 32px rgba(0,0,0,0.18)";
    }
    function end() {
      document.removeEventListener("touchmove", move);
      if (mode !== "drag") { mode = "idle"; return; }
      mode = "idle";
      const w = window.innerWidth;
      const velocity = dx / Math.max(1, Date.now() - startT); // px per ms
      const commit = dx > w * 0.35 || velocity > 0.5;
      main!.style.transition = "transform 0.26s cubic-bezier(0.22, 1, 0.36, 1)";
      if (commit) {
        main!.style.transform = `translate3d(${w}px,0,0)`;
        setNavKind("swipe");
        setTimeout(() => router.back(), 200);
      } else {
        main!.style.transform = "translate3d(0,0,0)";
        setTimeout(() => { main!.style.transition = ""; main!.style.transform = ""; main!.style.boxShadow = ""; }, 280);
      }
    }

    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", end, { passive: true });
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, [router]);

  return null;
}
