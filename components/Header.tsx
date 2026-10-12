"use client";

import { useT } from "@/components/LanguageProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { isRootPath, setNavKind } from "@/components/NavController";
import UserMenu from "./UserMenu";
import { NAV_ITEMS } from "@/lib/nav";
import { useRaceStatus } from "@/lib/useRaceStatus";

export default function Header() {
  const { t, lang } = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname() || "/";
  const status = useRaceStatus();

  // The search box closes whenever the page changes. (Sections + settings live in the More menu.)
  useEffect(() => { setSearchOpen(false); }, [pathname]);

  // iOS-style back button on phones, shown on every pushed (non-root) screen. Decided from the
  // path during render, so it appears in the same frame as the new page (no late layout shift).
  const canBack = !isRootPath(pathname);
  const goBack = () => {
    setNavKind("pop");
    const idx = typeof window.history.state?.__ctIdx === "number" ? window.history.state.__ctIdx : 0;
    if (idx > 0) router.back(); else router.push("/"); // opened directly: no earlier page, go Home
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setQuery("");
    // Below lg, search lives in its own overlay rather than the nav
    // menu — close it on submit so the results page isn't left hidden
    // behind it.
    setSearchOpen(false);
  }

  return (
    <header className="site-header sticky top-0 z-[100] pt-[env(safe-area-inset-top)] bg-[rgba(18,60,46,0.82)] backdrop-blur-xl text-surface border-b border-white/10 transition-colors">
      <div className="wrap flex items-center gap-3 md:gap-5 py-2 md:py-3.5">
        {canBack && (
          <button type="button" onClick={goBack} className="md:hidden back-btn" aria-label={t("Back")}>
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2 md:gap-2.5 font-display text-lg md:text-xl font-bold shrink-0" aria-label="Champ Turf">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={38} height={38} className="brand-logo w-8 h-8 md:w-[38px] md:h-[38px]" />
          Champ&nbsp;Turf
        </Link>

        <nav aria-label={t("Main navigation")} className="hidden md:flex flex-1 gap-0.5 overflow-x-auto no-scrollbar min-w-0">
          {NAV_ITEMS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`whitespace-nowrap text-sm px-3 py-2 rounded-full transition inline-flex items-center gap-1.5 ${isActive(href) ? "text-white bg-white/10" : "text-white/80 hover:text-white hover:bg-white/5"}`}
            >
              {t(label)}
              {href === "/live" && status.live && <span className="live-dot" aria-label={t("LIVE")} />}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="hidden lg:flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 min-w-[170px] shrink-0">
          <Search size={14} className="opacity-70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search…")}
            aria-label={t("Search")}
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/90 w-full"
          />
        </form>

        <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
          {/* Below lg, this is the only way to search — a dedicated toggle,
              separate from the hamburger nav, so typing isn't buried at the
              bottom of an 11-item list under the keyboard, and finishing a
              search doesn't leave a menu covering the results. */}
          <button
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/15"
            aria-label={t("Search")}
            onClick={() => setSearchOpen((v) => !v)}
          >
            {searchOpen ? <X size={16} /> : <Search size={16} />}
          </button>
          {/* Appearance, currency and language: one settings button on desktop; on phones the
              bottom bar's "More" opens the same menu, so the top bar stays uncluttered. */}
          <button
            type="button"
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/15"
            aria-label={t("Settings")}
            title={t("Settings")}
            onClick={() => window.dispatchEvent(new Event("ct:open-menu"))}
          >
            <SlidersHorizontal size={16} />
          </button>
          <UserMenu />
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} className="lg:hidden flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-2 mx-4 mb-4">
          <Search size={14} className="opacity-70 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search…")}
            aria-label={t("Search")}
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/90 w-full"
          />
        </form>
      )}

    </header>
  );
}
