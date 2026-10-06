"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, BellOff, Smartphone } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { savePushSubscription, removePushSubscription } from "@/lib/actions/follows";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "unconfigured";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** "Get alerts on this device" switch. Handles the awkward cases honestly:
 *  iPhone needs the app added to the Home Screen first, and a blocked
 *  permission can only be undone in the browser's own settings. */
export default function PushToggle() {
  const { t } = useT();
  const [state, setState] = useState<State>("loading");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    (async () => {
      const ua = navigator.userAgent;
      const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
      if (!vapid) return setState("unconfigured");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(isIos && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, [vapid]);

  function enable() {
    setError(null);
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid!),
        });
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const res = await savePushSubscription(json, navigator.userAgent);
        if (!res.ok) { await sub.unsubscribe(); throw new Error("save failed"); }
        setState("on");
      } catch {
        setError(t("Couldn't turn notifications on. Please try again."));
      }
    });
  }

  function disable() {
    setError(null);
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
      } catch {
        setError(t("Couldn't turn notifications off. Please try again."));
      }
    });
  }

  if (state === "loading") return <div className="text-sm opacity-70">…</div>;

  return (
    <div className="text-sm">
      {state === "on" && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="pill pill-gold inline-flex items-center gap-1"><BellRing size={12} /> {t("Alerts on for this device")}</span>
          <button type="button" onClick={disable} disabled={pending} className="tap underline opacity-70 disabled:opacity-40">{t("Turn off")}</button>
        </div>
      )}
      {state === "off" && (
        <button type="button" onClick={enable} disabled={pending} className="btn btn-gold disabled:opacity-60">
          <BellRing size={15} /> {t("Turn on alerts for this device")}
        </button>
      )}
      {state === "denied" && (
        <p className="opacity-70 flex gap-2"><BellOff size={16} className="shrink-0 mt-0.5" /> {t("Notifications are blocked for this site. Allow them in your browser's site settings, then come back.")}</p>
      )}
      {state === "ios-install" && (
        <p className="opacity-70 flex gap-2"><Smartphone size={16} className="shrink-0 mt-0.5" /> {t("On iPhone, first tap Share → Add to Home Screen, then open Champ Turf from your Home Screen to turn alerts on.")}</p>
      )}
      {state === "unsupported" && <p className="opacity-70">{t("This browser doesn't support push notifications. You'll still see your alerts below.")}</p>}
      {state === "unconfigured" && <p className="opacity-70">{t("Push notifications aren't set up on this site yet. You'll still see your alerts below.")}</p>}
      {error && <p className="text-coral-ink mt-2">{error}</p>}
    </div>
  );
}
