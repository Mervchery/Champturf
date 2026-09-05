"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { Race, RaceResult } from "@/lib/races";

type RaceWithResults = Race & { results: RaceResult[] };

export default function ResultsSearch({ races }: { races: RaceWithResults[] }) {
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
          placeholder="Search by horse, jockey, trainer, race…"
          className="px-3.5 py-2 border border-line rounded-full bg-surface text-sm flex-1"
        />
        <button onClick={() => alert("Generating PDF report… (wire this up to a real export endpoint)")} className="btn btn-outline">
          <Download size={15} /> Download PDF report
        </button>
      </div>

      {filtered.length === 0 && <p className="text-sm opacity-60">No results match your search.</p>}

      {filtered.map((r) => (
        <div key={r.id} className="panel mb-4">
          <div className="flex justify-between flex-wrap gap-2">
            <h4 className="font-semibold">{r.name}</h4>
            <span className="text-sm opacity-60">{r.race_date} · {r.course} · {r.distance}</span>
          </div>
          {r.results.length === 0 ? (
            <p className="text-sm opacity-60 mt-2">No result entered yet.</p>
          ) : (
            <table className="mt-3">
              <thead><tr><th>Pos</th><th>Horse</th><th>Jockey</th><th>Time</th></tr></thead>
              <tbody>
                {r.results.map((row) => (
                  <tr key={row.id}>
                    <td>{row.position}</td>
                    <td>{row.horses?.name ?? "—"}</td>
                    <td>{row.jockey}</td>
                    <td className="font-mono">{row.finish_time}</td>
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
