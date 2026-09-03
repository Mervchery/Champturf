"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { RACES, horseById } from "@/lib/data";

export default function ResultsPage() {
  const [q, setQ] = useState("");
  const completed = RACES.filter((r) => r.status === "completed" && r.result);

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return completed.filter((r) => {
      const blob = (r.name + " " + r.result!.map((x) => horseById(x.horse)?.name + " " + x.jockey).join(" ")).toLowerCase();
      return blob.includes(query);
    });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">RESULTS CENTRE</span>
          <h1 className="text-3xl font-display mt-1">Race results</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
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
                <span className="text-sm opacity-60">{r.date} · {r.course} · {r.distance}</span>
              </div>
              <table className="mt-3">
                <thead><tr><th>Pos</th><th>Horse</th><th>Jockey</th><th>Time</th></tr></thead>
                <tbody>
                  {r.result!.map((row) => (
                    <tr key={row.pos}>
                      <td>{row.pos}</td>
                      <td>{horseById(row.horse)?.name}</td>
                      <td>{row.jockey}</td>
                      <td className="font-mono">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
