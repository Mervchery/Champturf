"use client";

import { useT } from "@/components/LanguageProvider";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { ordinal } from "@/lib/i18n";
import type { Race, RaceResult } from "@/lib/races";

type RaceWithResults = Race & { results: RaceResult[] };

export default function ResultsSearch({ races }: { races: RaceWithResults[] }) {
  const { t, lang } = useT();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return races.filter((r) => {
      const blob = (r.name + " " + r.results.map((x) => (x.horses?.name ?? "") + " " + x.jockey).join(" ")).toLowerCase();
      return blob.includes(query);
    });
  }, [q, races]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2.5 mb-7">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Search by horse, jockey, trainer, race…")}
          className="px-3.5 py-2 border border-line rounded-full bg-surface text-sm flex-1"
        />
        <button onClick={() => window.print()} className="btn btn-outline print:hidden">
          <Download size={15} /> {t("Print / save as PDF")}
        </button>
      </div>

      {filtered.length === 0 && <p className="text-sm opacity-70">{t("No results match your search.")}</p>}

      {filtered.map((r) => (
        <div key={r.id} className="panel mb-4">
          <div className="flex justify-between flex-wrap gap-2">
            <h2 className="font-semibold">{r.name}</h2>
            <span className="text-sm opacity-70">{r.race_date} · {r.course} · {r.distance}</span>
          </div>
          {r.results.length === 0 ? (
            <p className="text-sm opacity-70 mt-2">{t("No result entered yet.")}</p>
          ) : (
            <table className="data-table mt-3">
              <thead><tr><th>{t("Pos")}</th><th>{t("No.")}</th><th>{t("Horse")}</th><th>{t("Jockey")}</th><th>{t("Time")}</th></tr></thead>
              <tbody>
                {r.results.map((row) => (
                  <tr key={row.id}>
                    <td>{ordinal(lang, row.position)}</td>
                    <td data-label={t("No.")} className="tabular-nums opacity-70">{row.runner_no ?? t("N/A")}</td>
                    <td data-title>{row.horses?.name ?? "—"}</td>
                    <td data-label={t("Jockey")}>{row.jockey}</td>
                    <td data-label={t("Time")} className="font-mono">{row.finish_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
