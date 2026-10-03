"use client";

import { useT } from "@/components/LanguageProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, Search, Settings } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  ["/", "Home"],
  ["/race-days", "Race Days"],
  ["/horses", "Horses"],
  ["/jockeys", "Jockeys"],
  ["/trainers", "Trainers"],
  ["/stables", "Stables"],
  ["/owners", "Owners"],
  ["/news", "News"],
  ["/stats", "Statistics"],
  ["/results", "Results"],
  ["/live", "Live"],
];

export default function Header() {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

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
    <div className="sticky top-0 z-[100] bg-[rgba(18,60,46,0.82)] backdrop-blur-xl text-surface border-b border-white/10 transition-colors">
      <div className="wrap flex items-center gap-5 py-3.5">
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 border border-white/15 shrink-0"
          aria-label={t("Menu")}
          onClick={() => { setOpen((v) => !v); setSearchOpen(false); }}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold shrink-0" aria-label="Champ Turf">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={38} height={38} className="brand-logo" />
          Champ&nbsp;Turf
        </Link>

        <nav className="hidden md:flex flex-1 gap-0.5 overflow-x-auto no-scrollbar min-w-0">
          {NAV_ITEMS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap text-sm px-3 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition"
            >
              {t(label)}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="hidden lg:flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 min-w-[170px] shrink-0">
          <Search size={14} className="opacity-60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search…")}
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/50 w-full"
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
            onClick={() => { setSearchOpen((v) => !v); setOpen(false); }}
          >
            {searchOpen ? <X size={16} /> : <Search size={16} />}
          </button>
          <ThemeToggle />
          <Link
            href="/admin"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/15"
            aria-label={t("Staff area")}
            title={t("Staff area")}
          >
            <Settings size={16} />
          </Link>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} className="lg:hidden flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-2 mx-4 mb-4">
          <Search size={14} className="opacity-60 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search…")}
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/50 w-full"
          />
        </form>
      )}

      {open && (
        <nav className="md:hidden flex flex-col gap-1 px-4 pb-4">
          {NAV_ITEMS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="px-3 py-3 rounded-lg text-sm border-b border-white/5"
            >
              {t(label)}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
