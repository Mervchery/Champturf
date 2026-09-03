import Link from "next/link";
import { search } from "@/lib/data";

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q || "";
  const results = search(q);

  return (
    <section className="py-10">
      <div className="wrap">
        <h2 className="font-display text-2xl mb-5">Search results for &ldquo;{q}&rdquo;</h2>
        {results.length === 0 ? (
          <p className="text-sm opacity-60">No matches found.</p>
        ) : (
          <div className="panel">
            {results.map((r, i) => (
              <Link key={i} href={r.href} className="grid grid-cols-[1fr_auto] gap-3.5 items-center py-3 border-b border-line last:border-0">
                <div>
                  <div className="font-semibold text-sm">{r.label}</div>
                </div>
                <span className="pill">{r.type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
