"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, Search, CircleDot, Settings } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setQuery("");
  }

  return (
    <div className="sticky top-0 z-[100] bg-[rgba(18,60,46,0.82)] backdrop-blur-xl text-surface border-b border-white/10 transition-colors">
      <div className="wrap flex items-center gap-5 py-3.5">
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 border border-white/15 shrink-0"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link href="/" className="flex items-baseline font-display italic tracking-tighter leading-none text-xl font-bold shrink-0">
         <span className="text-white">CHAMP</span>
         <span className="text-yellow-400">TURF</span>
          
        </Link>

        <nav className="hidden md:flex flex-1 gap-0.5 overflow-x-auto no-scrollbar min-w-0">
          {NAV_ITEMS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap text-sm px-3 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition"
            >
              {label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="hidden lg:flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 min-w-[170px] shrink-0">
          <Search size={14} className="opacity-60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/50 w-full"
          />
        </form>

        <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
          <ThemeToggle />
          <Link
            href="/admin"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/15"
            aria-label="Admin"
            title="Admin"
          >
            <Settings size={16} />
          </Link>
        </div>
      </div>

      {open && (
        <nav className="md:hidden flex flex-col gap-1 px-4 pb-4">
          {NAV_ITEMS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="px-3 py-3 rounded-lg text-sm border-b border-white/5"
            >
              {label}
            </Link>
          ))}
          <form onSubmit={submitSearch} className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-2 mt-2">
            <Search size={14} className="opacity-60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="bg-transparent outline-none text-sm text-white placeholder:text-white/50 w-full"
            />
          </form>
        </nav>
      )}
    </div>
  );
}
