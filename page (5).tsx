import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type Result = { type: string; label: string; href: string };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || "").trim();
  const results = q ? await runSearch(q) : [];

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
                <div className="font-semibold text-sm">{r.label}</div>
                <span className="pill">{r.type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

async function runSearch(q: string): Promise<Result[]> {
  const supabase = createClient();
  const like = `%${q}%`;
  const results: Result[] = [];

  const [horses, jockeys, trainers, stables, owners, races, news] = await Promise.all([
    supabase.from("horses").select("id, name").ilike("name", like),
    supabase.from("jockeys").select("id, name, apprentice").ilike("name", like),
    supabase.from("trainers").select("name").ilike("name", like),
    supabase.from("stables").select("name").ilike("name", like),
    supabase.from("owners").select("name").ilike("name", like),
    supabase.from("races").select("id, name").ilike("name", like),
    supabase.from("news").select("id, title").ilike("title", like),
  ]);

  horses.data?.forEach((h) => results.push({ type: "Horse", label: h.name, href: `/horses/${h.id}` }));
  jockeys.data?.forEach((j) => results.push({ type: j.apprentice ? "Apprentice" : "Jockey", label: j.name, href: `/jockeys/${j.id}` }));
  trainers.data?.forEach((t) => results.push({ type: "Trainer", label: t.name, href: "/trainers" }));
  stables.data?.forEach((s) => results.push({ type: "Stable", label: s.name, href: "/stables" }));
  owners.data?.forEach((o) => results.push({ type: "Owner", label: o.name, href: "/owners" }));
  races.data?.forEach((r) => results.push({ type: "Race", label: r.name, href: `/races/${r.id}` }));
  news.data?.forEach((n) => results.push({ type: "News", label: n.title, href: "/news" }));

  return results;
}
