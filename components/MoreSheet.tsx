"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Globe, Coins, Monitor, Moon, Sun, X } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { useCurrency } from "@/components/Money";
import Segmented from "@/components/Segmented";
import { useRaceStatus } from "@/lib/useRaceStatus";
import { NAV_ITEMS } from "@/lib/nav";
import { CURRENCY_COOKIE, type Currency } from "@/lib/currency";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { THEME_KEY, applyTheme, readTheme, type Theme } from "@/lib/theme";

/** The "More" menu: every section of the site (on phones) plus the display settings —
 *  appearance (light / dark / auto), currency (Rs / £) and language. Opened from the bottom
 *  tab bar's More button or the settings button in the desktop header (window event
 *  "ct:open-menu"). A bottom sheet on phones, a popover card on larger screens. */
export default function MoreSheet() {
  const { t, lang } = useT();
  const { currency, rate } = useCurrency();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const status = useRaceStatus();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [pending, startTransition] = useTransition();
  const closeBtn = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Open/close wiring.
  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener("ct:open-menu", toggle);
    return () => window.removeEventListener("ct:open-menu", toggle);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);

  // Theme: read the saved choice, and follow the device live while set to Auto.
  useEffect(() => {
    setTheme(readTheme());
  }, []);
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyTheme("system");
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [theme]);

  // While open: Esc closes, the page behind doesn't scroll, focus moves in and back out.
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      before?.focus?.();
    };
  }, [open]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode: still applies for this visit */ }
    applyTheme(next);
  }
  function chooseCurrency(code: Currency) {
    if (code === currency) return;
    document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }
  function chooseLang(code: Lang) {
    if (code === lang) return;
    document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  if (!open) return null;

  return (
    <div className="sheet-root">
      <button type="button" className="sheet-backdrop" aria-label={t("Close")} onClick={() => setOpen(false)} tabIndex={-1} />
      <div role="dialog" aria-modal="true" aria-label={t("Menu")} className="sheet-panel">
        <div className="sheet-grab md:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between pt-1 pb-2">
          <h2 className="font-display text-xl">{t("Menu")}</h2>
          <button ref={closeBtn} type="button" onClick={() => setOpen(false)} className="sheet-close" aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        {/* Sections — the header already shows these on a desktop. */}
        <nav aria-label={t("Main navigation")} className="grid grid-cols-2 gap-2 md:hidden pb-2">
          {NAV_ITEMS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={`sheet-link ${isActive(href) ? "is-active" : ""}`}>
              {t(label)}
              {href === "/live" && status.live && <span className="live-dot text-[var(--coral-ink)]" aria-label={t("LIVE")} />}
            </Link>
          ))}
        </nav>

        <div className="setting-row">
          <div className="setting-label"><Sun size={13} aria-hidden="true" /> {t("Appearance")}</div>
          <Segmented<Theme>
            label={t("Appearance")}
            value={theme}
            onChange={chooseTheme}
            options={[
              { value: "light", label: <><Sun size={15} /> {t("Light")}</> },
              { value: "dark", label: <><Moon size={15} /> {t("Dark")}</> },
              { value: "system", label: <><Monitor size={15} /> {t("Auto")}</> },
            ]}
          />
        </div>

        <div className="setting-row">
          <div className="setting-label"><Coins size={13} aria-hidden="true" /> {t("Currency")}</div>
          <Segmented<Currency>
            label={t("Currency")}
            value={currency}
            pending={pending}
            onChange={chooseCurrency}
            options={[
              { value: "MUR", label: "Rs", title: "Mauritian rupee" },
              { value: "GBP", label: "£", title: "Pound sterling" },
            ]}
          />
          <p className="text-[0.72rem] opacity-65">
            {currency === "GBP" ? t("Approximate rate: £1 = Rs {n}", { n: rate.toFixed(2) }) : t("Show amounts in pounds (£)")}
          </p>
        </div>

        <div className="setting-row">
          <div className="setting-label"><Globe size={13} aria-hidden="true" /> {t("Language")}</div>
          <Segmented<Lang>
            label={t("Language")}
            value={lang}
            pending={pending}
            onChange={chooseLang}
            options={[
              { value: "en", label: "English" },
              { value: "fr", label: "Français" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
