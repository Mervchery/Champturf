"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, MoreVertical, Plus, Share, Smartphone, Monitor, X } from "lucide-react";
import { useT } from "@/components/LanguageProvider";

// Chrome/Edge/Android fire this when the site is installable. Not in lib.dom yet.
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac, but it has a touch screen.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** "Add to Home Screen" button + a step-by-step sheet for iPhone/iPad, Android and
 *  desktop. Where the browser supports a real install prompt (Chrome / Edge /
 *  Android) the sheet also offers a one-tap "Install now". Hidden once the site is
 *  already running from the Home Screen. */
export default function InstallApp({ className = "btn btn-gold" }: { className?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("ios");
  const [tab, setTab] = useState<Platform>("ios");
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    const p = detectPlatform();
    setPlatform(p);
    setTab(p);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setOpen(false); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  // Escape closes, background doesn't scroll, focus moves into the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, close]);

  async function installNow() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
  }

  if (installed) return null;

  const tabs: { id: Platform; label: string; Icon: typeof Smartphone }[] = [
    { id: "ios", label: t("iPhone / iPad"), Icon: Smartphone },
    { id: "android", label: t("Android"), Icon: Smartphone },
    { id: "desktop", label: t("Computer"), Icon: Monitor },
  ];

  const steps: Record<Platform, { icon?: React.ReactNode; text: string }[]> = {
    ios: [
      { text: t("Open Champ Turf in Safari. (Inside another app, tap its menu and choose “Open in Safari” first.)") },
      { icon: <Share size={16} />, text: t("Tap the Share button — the square with an arrow pointing up — at the bottom of the screen (top on iPad).") },
      { icon: <Plus size={16} />, text: t("Scroll down and tap “Add to Home Screen”.") },
      { text: t("Tap “Add” in the top-right corner. Champ Turf now sits on your Home Screen like any other app.") },
    ],
    android: [
      { text: t("Open Champ Turf in Chrome.") },
      { icon: <MoreVertical size={16} />, text: t("Tap the three-dot menu in the top-right corner.") },
      { icon: <Plus size={16} />, text: t("Tap “Install app” or “Add to Home screen”.") },
      { text: t("Confirm with “Install” (or “Add”). Open Champ Turf from your Home Screen or app drawer.") },
    ],
    desktop: [
      { text: t("Use Chrome or Edge.") },
      { icon: <Download size={16} />, text: t("Click the install icon at the right end of the address bar — or open the browser menu and choose “Install Champ Turf”.") },
      { text: t("Click “Install”. The app opens in its own window.") },
    ],
  };

  return (
    <>
      <button ref={openerRef} type="button" onClick={() => { setTab(platform); setOpen(true); }} className={className}>
        <Smartphone size={16} aria-hidden="true" /> {t("Add to Home Screen")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            className="install-sheet w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface text-ink shadow-lg p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="install-title" className="font-display text-2xl">{t("Add Champ Turf to your Home Screen")}</h2>
                <p className="text-sm opacity-70 mt-1.5">
                  {t("Open the races in one tap, full screen, like an app. It also lets you turn on race-day alerts on iPhone.")}
                </p>
              </div>
              <button ref={closeRef} type="button" onClick={close} aria-label={t("Close")} className="shrink-0 w-10 h-10 -mr-2 -mt-1 rounded-full flex items-center justify-center hover:bg-black/5">
                <X size={18} />
              </button>
            </div>

            {deferred && (
              <button type="button" onClick={installNow} className="btn btn-dark w-full justify-center mt-5">
                <Download size={16} /> {t("Install now")}
              </button>
            )}

            <div role="tablist" aria-label={t("Choose your device")} className="flex gap-1.5 mt-5 p-1 rounded-full bg-parchment2">
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  id={`install-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`install-panel-${id}`}
                  onClick={() => setTab(id)}
                  className={`flex-1 min-h-[36px] px-2 rounded-full text-[0.8rem] font-semibold transition-colors ${tab === id ? "bg-surface shadow-sm" : "opacity-70"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <ol role="tabpanel" id={`install-panel-${tab}`} aria-labelledby={`install-tab-${tab}`} className="mt-5 space-y-4">
              {steps[tab].map((s, i) => (
                <li key={i} className="flex gap-3.5 items-start">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-turf text-[#fbf8f0] text-xs font-bold flex items-center justify-center font-mono">{i + 1}</span>
                  <span className="text-sm leading-relaxed pt-0.5">
                    {s.icon && <span className="inline-flex align-text-bottom mr-1.5 p-1 rounded-md bg-parchment2" aria-hidden="true">{s.icon}</span>}
                    {s.text}
                  </span>
                </li>
              ))}
            </ol>

            <button type="button" onClick={close} className="btn btn-outline w-full justify-center mt-6">{t("Got it")}</button>
          </div>
        </div>
      )}
    </>
  );
}
