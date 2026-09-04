import Link from "next/link";
import { Newspaper } from "lucide-react";
import { getNews } from "@/lib/news";

export const revalidate = 0;

export default async function NewsPage({ searchParams }: { searchParams: { cat?: string } }) {
  const cat = searchParams.cat || "";
  const news = await getNews();
  const list = news.filter((n) => !cat || n.category === cat);
  const cats = ["Race preview", "Race review", "Interview", "Press release"];

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">EDITORIAL</span>
          <h1 className="text-3xl font-display mt-1">News &amp; reports</h1>
        </div>
      </div>
      <section className="py-14">
        <div className="wrap">
          <div className="flex gap-2 flex-wrap mb-7">
            <Link href="/news" className={`pill ${!cat ? "pill-gold" : "pill-outline"}`}>All</Link>
            {cats.map((c) => (
              <Link key={c} href={`/news?cat=${encodeURIComponent(c)}`} className={`pill ${cat === c ? "pill-gold" : "pill-outline"}`}>{c}</Link>
            ))}
          </div>
          {list.length === 0 && <p className="text-sm opacity-60">No articles yet.</p>}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {list.map((n) => (
              <div key={n.id} className="card">
                <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                  <Newspaper size={28} />
                </div>
                <div className="p-4">
                  <span className="pill">{n.category}</span>
                  <h4 className="mt-2 font-semibold">{n.title}</h4>
                  <p className="text-sm opacity-60 mt-1.5">{n.excerpt}</p>
                  <div className="text-xs opacity-55 mt-2.5">{n.article_date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
