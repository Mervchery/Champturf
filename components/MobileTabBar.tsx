"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, LayoutGrid, Radio, Trophy } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { useRaceStatus } from "@/lib/useRaceStatus";

/** Phone-only bottom navigation: the five things people actually do on a race day.
 *  Everything else stays in the header menu ("More" opens it). */
export default function MobileTabBar() {
  const { t } = useT();
  const pathname = usePathname() || "/";
  const status = useRaceStatus();

  // "Race day" goes straight to the next race when we know it, else the current meeting, else the calendar.
  const raceDayHref = status.next ? `/races/${status.next.id}` : status.date ? `/race-days/${status.date}` : "/race-days";

  const tabs: { href: string; label: string; icon: React.ReactNode; active: boolean; live?: boolean }[] = [
    { href: "/", label: t("Home"), icon: <Home size={20} />, active: pathname === "/" },
    { href: raceDayHref, label: t("Race day"), icon: <CalendarDays size={20} />, active: pathname.startsWith("/race-days") || pathname.startsWith("/races") },
    { href: "/results", label: t("Results"), icon: <Trophy size={20} />, active: pathname.startsWith("/results") },
    { href: "/live", label: t("Live"), icon: <Radio size={20} />, active: pathname.startsWith("/live"), live: status.live },
  ];

  // The admin area has its own layout; the public quick-nav would only sit on top of it.
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
    <nav className="tabbar md:hidden" aria-label={t("Quick navigation")}>
      {tabs.map((tab) => (
        <Link key={tab.label} href={tab.href} className={`tabbar-item ${tab.active ? "is-active" : ""}`} aria-current={tab.active ? "page" : undefined}>
          <span className="tabbar-icon">
            {tab.icon}
            {tab.live && <span className="tabbar-live" aria-label={t("LIVE")} />}
          </span>
          <span>{tab.label}</span>
        </Link>
      ))}
      <button
        type="button"
        className="tabbar-item"
        onClick={() => window.dispatchEvent(new Event("ct:open-menu"))}
        aria-label={t("Menu")}
      >
        <span className="tabbar-icon"><LayoutGrid size={20} /></span>
        <span>{t("More")}</span>
      </button>
    </nav>
    {/* Keeps the end of the page (footer) clear of the fixed bar. */}
    <div className="tabbar-spacer md:hidden" aria-hidden="true" />
    </>
  );
}
