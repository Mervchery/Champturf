"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, MoreVertical, Plus, Share, X } from "lucide-react";
import { useT } from "@/components/LanguageProvider";

// Chrome / Edge / Android fire this when the site can be installed.
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android";

const KEY = "ct-install-hint";
const SNOOZE_DAYS = 7; // "Not now" hides it for a week…
const MAX_DISMISSALS = 3; // …and after the third time it never comes back.
const SHOW_AFTER_MS = 1400;

type Saved = { at: number; n: number };

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch { return null; }
}
function writeSaved(s: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: it just returns next visit */ }
}

/** Phones and tablets only — desktops already have the footer's install button. */
function detectMobile(): Platform | null {
  const ua = navigator.userAgent;
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS only installs from Safari (or Chrome/Edge/Firefox on iOS 16.4+). Facebook, Instagram,
 *  Gmail etc. open links in a webview with no Share → Add to Home Screen. */
function inAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|GSA\/|Snapchat|TikTok|Twitter/i.test(navigator.userAgent);
}

/** A small Apple-style card that slides up the first time someone opens the site in a
 *  phone browser, telling them they can install it and exactly how. Never shown inside the
 *  installed app, on desktop, or on the admin screens; "Not now" snoozes it for a week and
 *  it gives up for good after three dismissals. The footer's "Add to Home Screen" button
 *  stays available for anyone who wants it later. */
export default function InstallHint() {
  const { t } = useT();
  const pathname = usePathname() || "/";
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [webview, setWebview] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const blocked = pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname.startsWith("/auth");

  // Decide once whether this visitor should ever see it.
  useEffect(() => {
    const p = detectMobile();
    if (!p || isStandalone()) return;
    const saved = readSaved();
    if (saved) {
      if (saved.n >= MAX_DISMISSALS) return;
      if (Date.now() - saved.at < SNOOZE_DAYS * 86400_000) return;
    }
    setPlatform(p);
    setWebview(inAppBrowser());
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as InstallEvent); };
    const onInstalled = () => { writeSaved({ at: Date.now(), n: MAX_DISMISSALS }); setVisible(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    timer.current = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback((forever = false) => {
    if (closing) return;
    const prev = readSaved();
    writeSaved({ at: Date.now(), n: forever ? MAX_DISMISSALS : (prev?.n ?? 0) + 1 });
    setClosing(true);
    setTimeout(() => { setVisible(false); setClosing(false); }, 260);
  }, [closing]);

  // Escape closes (keyboard / switch-control users).
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  // Swipe down to dismiss, like any iOS sheet.
  useEffect(() => {
    const el = cardRef.current;
    if (!visible || !el) return;
    let startY = 0, dy = 0, tracking = false;
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; dy = 0; tracking = true; el.style.transition = "none"; };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      el.style.transform = `translate3d(0,${dy}px,0)`;
      el.style.opacity = String(Math.max(0.3, 1 - dy / 260));
    };
    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      el.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s";
      if (dy > 70) {
        el.style.transform = "translate3d(0,140%,0)";
        el.style.opacity = "0";
        dismiss();
      } else {
        el.style.transform = "";
        el.style.opacity = "";
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [visible, dismiss]);

  async function installNow() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    if (choice?.outcome === "accepted") { writeSaved({ at: Date.now(), n: MAX_DISMISSALS }); setVisible(false); }
  }

  if (!platform || !visible || blocked) return null;

  const steps: { icon: React.ReactNode; text: string }[] =
    platform === "ios"
      ? [
          { icon: <Share size={17} strokeWidth={2.2} />, text: t("Tap Share in Safari’s toolbar. If you don’t see it, tap ⋯ first.") },
          { icon: <Plus size={17} strokeWidth={2.2} />, text: t("Scroll down and choose “Add to Home Screen”.") },
          { icon: <span className="text-[0.7rem] font-bold">{t("Add")}</span>, text: t("Tap “Add” in the top-right corner. Done.") },
        ]
      : [
          { icon: <MoreVertical size={17} strokeWidth={2.2} />, text: t("Tap the ⋮ menu in the top-right corner of Chrome.") },
          { icon: <Plus size={17} strokeWidth={2.2} />, text: t("Choose “Install app” or “Add to Home screen”.") },
          { icon: <span className="text-[0.7rem] font-bold">{t("Install")}</span>, text: t("Confirm with “Install”. Done.") },
        ];

  return (
    <div className="ih-wrap" role="presentation">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="ih-title"
        aria-describedby="ih-sub"
        className={`ih-card ${closing ? "is-closing" : ""}`}
      >
        <div className="ih-grab" aria-hidden="true" />
        <button type="button" onClick={() => dismiss()} aria-label={t("Close")} className="ih-x"><X size={15} strokeWidth={2.4} /></button>

        <div className="ih-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={60} height={60} className="ih-icon" />
          <div className="min-w-0">
            <h2 id="ih-title" className="ih-title">{t("Get Champ Turf on your Home Screen")}</h2>
            <p id="ih-sub" className="ih-sub">{t("Race cards, live odds and results one tap away, plus race-day alerts.")}</p>
          </div>
        </div>

        {platform === "ios" && webview && (
          <p className="ih-warn">{t("You’re in an in-app browser. Tap ⋯ and choose “Open in Safari” first — installing only works from Safari.")}</p>
        )}

        <ol className="ih-steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="ih-glyph" aria-hidden="true">{s.icon}</span>
              <span className="ih-step-text"><span className="ih-n">{i + 1}</span>{s.text}</span>
            </li>
          ))}
        </ol>

        <div className="ih-actions">
          {deferred ? (
            <button type="button" onClick={installNow} className="ih-primary"><Download size={16} aria-hidden="true" /> {t("Install now")}</button>
          ) : (
            <button type="button" onClick={() => dismiss()} className="ih-primary">{t("Got it")}</button>
          )}
          <button type="button" onClick={() => dismiss()} className="ih-secondary">{t("Not now")}</button>
        </div>
      </div>
    </div>
  );
}
