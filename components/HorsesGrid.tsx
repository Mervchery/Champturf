"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HorseIcon } from "@/components/RacingIcons";
import type { Horse } from "@/lib/horses";

export default function HorsesGrid({ horses }: { horses: Horse[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"wins" | "earnings" | "name">("wins");

  const list = useMemo(() => {
    let l = horses.filter((h) => (h.name + (h.owner ?? "") + (h.stable ?? "")).toLowerCase().includes(q.toLowerCase()));
    l = [...l].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : (b as any)[sort] - (a as any)[sort]));
    return l;
  }, [horses, q, sort]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2.5 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, owner, stable…"
          className="px-3.5 py-2 border border-line rounded-full bg-surface text-sm flex-1"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="px-3.5 py-2 border border-line rounded-full bg-surface text-sm">
          <option value="wins">Sort: most wins</option>
          <option value="earnings">Sort: earnings</option>
          <option value="name">Sort: name A–Z</option>
        </select>
      </div>
      {list.length === 0 && <p className="text-sm opacity-60">No horses match your search.</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {list.map((h) => (
          <Link key={h.id} href={`/horses/${h.id}`} className="card">
            <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
              <HorseIcon size={36} />
            </div>
            <div className="p-4">
              <h4 className="font-semibold">{h.name}</h4>
              <div className="text-xs opacity-60 mt-1">{h.age}yo {h.sex} · {h.color}</div>
              <div className="flex gap-3.5 mt-3 text-xs">
                <div><b className="block font-mono text-sm">{h.wins}</b>Wins</div>
                <div><b className="block font-mono text-sm">{h.seconds + h.thirds}</b>Placed</div>
                <div><b className="block font-mono text-sm">{h.starts}</b>Starts</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
