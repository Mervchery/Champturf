"use client";

import { useT } from "@/components/LanguageProvider";
import { useMemo, useState, type ReactNode } from "react";
import { Download, Search } from "lucide-react";
import { fmtDateLong } from "@/lib/i18n";

export type ResultItem = {
  id: string;
  date: string;
  /** Lower-cased names of every finisher, jockey and trainer. */
  search: string;
  /** The race's result card, rendered on the server. */
  node: ReactNode;
};

/** Search box + print button over the results list, grouped by race day. The cards are
 *  rendered on the server and passed in; this only decides which stay visible. */
export default function ResultsSearch({ items }: { items: ResultItem[] }) {
  const { t, lang } = useT();
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const shown = query ? items.filter((i) => i.search.includes(query)) : items;
    const byDate = new Map<string, ResultItem[]>();
    for (const it of shown) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);
    return [...byDate.entries()];
  }, [q, items]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2.5 mb-5 print:hidden">
        <label className="relative flex-1">
          <span className="sr-only">{t("Search by horse, jockey, trainer, race…")}</span>
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            inputMode="search"
            placeholder={t("Search by horse, jockey, trainer, race…")}
            className="w-full pl-10 pr-3.5 min-h-[44px] border border-line rounded-full bg-surface text-sm"
          />
        </label>
        <button onClick={() => window.print()} className="btn btn-outline">
          <Download size={15} /> {t("Print / save as PDF")}
        </button>
      </div>

      {groups.length === 0 && <p className="text-sm opacity-70 py-6 text-center">{t("No results match your search.")}</p>}

      {groups.map(([date, list]) => (
        <section key={date} className="mb-8" id={`day-${date}`}>
          <h2 className="font-display text-xl mb-3">{fmtDateLong(lang, date)}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {list.map((it) => <div key={it.id}>{it.node}</div>)}
          </div>
        </section>
      ))}
    </div>
  );
}
