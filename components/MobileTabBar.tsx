"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Home, LayoutGrid, Radio, Trophy } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { useRaceStatus } from "@/lib/useRaceStatus";
import { isRootPath, recallTabPath, setNavKind, tabOf } from "@/components/NavController";

/** Phone-only bottom navigation, behaving like an iOS tab bar:
 *  - each tab remembers the page you were on inside it (Results → a race → other tab → back to that race);
 *  - tapping the tab you are already on scrolls to the top, and a second tap pops back to the tab's root;
 *  - a gold indicator glides between tabs and the active icon springs. */
export default function MobileTabBar() {
  const { t } = useT();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const status = useRaceStatus();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onState = (e: Event) => setMenuOpen(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener("ct:menu-state", onState);
    return () => window.removeEventListener("ct:menu-state", onState);
  }, []);

  // "Race day" goes straight to the next race when we know it, else the current meeting, else the calendar.
  const raceDayHref = status.next ? `/races/${status.next.id}` : status.date ? `/race-days/${status.date}` : "/race-days";

  const tabs: { key: "home" | "raceday" | "results" | "live"; href: string; root: string; label: string; icon: typeof Home; live?: boolean }[] = [
    { key: "home", href: "/", root: "/", label: t("Home"), icon: Home },
    { key: "raceday", href: raceDayHref, root: "/race-days", label: t("Race day"), icon: CalendarDays },
    { key: "results", href: "/results", root: "/results", label: t("Results"), icon: Trophy },
    { key: "live", href: "/live", root: "/live", label: t("Live"), icon: Radio, live: status.live },
  ];

  const current = tabOf(pathname);
  // The admin area has its own layout; the public quick-nav would only sit on top of it.
  if (pathname.startsWith("/admin")) return null;

  const activeIndex = menuOpen ? 4 : tabs.findIndex((x) => x.key === current);

  function onTab(e: React.MouseEvent, tab: (typeof tabs)[number]) {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (tab.key === current) {
      e.preventDefault();
      if (window.scrollY > 4) {
        window.scrollTo({ top: 0, behavior: "smooth" }); // first tap: back to top
      } else if (!isRootPath(pathname) || pathname !== tab.root) {
        setNavKind("pop");
        router.push(tab.root); // second tap: pop to the tab's root
      }
      return;
    }
    // Switching tabs: reopen where that tab was left (the race-day tab always aims at the next race).
    const remembered = tab.key === "raceday" ? null : recallTabPath(tab.key);
    if (remembered && remembered !== tab.href) {
      e.preventDefault();
      setNavKind("tab");
      router.push(remembered);
    }
  }

  return (
    <>
    <nav className="tabbar md:hidden" aria-label={t("Quick navigation")}>
      <span
        className="tabbar-indicator"
        aria-hidden="true"
        style={{ transform: `translate3d(${Math.max(activeIndex, 0) * 100}%,0,0)`, opacity: activeIndex < 0 ? 0 : 1 }}
      />
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = !menuOpen && tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            onClick={(e) => onTab(e, tab)}
            className={`tabbar-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="tabbar-icon">
              <Icon size={22} strokeWidth={active ? 2.4 : 1.9} fill={active ? "currentColor" : "none"} fillOpacity={0.16} />
              {tab.live && <span className="tabbar-live" aria-label={t("LIVE")} />}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className={`tabbar-item ${menuOpen ? "is-active" : ""}`}
        onClick={() => window.dispatchEvent(new Event("ct:open-menu"))}
        aria-label={t("Menu")}
        aria-expanded={menuOpen}
      >
        <span className="tabbar-icon"><LayoutGrid size={22} strokeWidth={menuOpen ? 2.4 : 1.9} /></span>
        <span>{t("More")}</span>
      </button>
    </nav>
    {/* Keeps the end of the page (footer) clear of the fixed bar. */}
    <div className="tabbar-spacer md:hidden" aria-hidden="true" />
    </>
  );
}
