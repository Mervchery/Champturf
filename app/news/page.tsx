import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { getNews } from "@/lib/news";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Racing news"), description: t("Latest news and reports from Mauritian horse racing."), path: "/news" });
}

export default async function NewsPage({ searchParams }: { searchParams: { cat?: string } }) {
  const { t, lang } = getT();
  const cat = searchParams.cat || "";
  const news = await getNews();
  const list = news.filter((n) => !cat || n.category === cat);
  const cats = ["Race preview", "Race review", "Interview", "Press release"];

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("EDITORIAL")}</span>
          <h1 className="text-3xl font-display mt-1">{t("News & reports")}</h1>
        </div>
      </div>
      <section className="py-10 md:py-14">
        <div className="wrap">
          <div className="flex gap-2 flex-wrap mb-7">
            <Link href="/news" className={`pill ${!cat ? "pill-gold" : "pill-outline"}`}>{t("All")}</Link>
            {cats.map((c) => (
              <Link key={c} href={`/news?cat=${encodeURIComponent(c)}`} className={`pill ${cat === c ? "pill-gold" : "pill-outline"}`}>{t(c)}</Link>
            ))}
          </div>
          {list.length === 0 && <p className="text-sm opacity-70">{t("No articles yet.")}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {list.map((n) => (
              <div key={n.id} className="card">
                <div className="h-[150px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/75">
                  <Newspaper size={28} />
                </div>
                <div className="p-4">
                  <span className="pill">{t(n.category)}</span>
                  <h2 className="mt-2 font-semibold">{n.title}</h2>
                  <p className="text-sm opacity-70 mt-1.5">{n.excerpt ?? t("N/A")}</p>
                  <div className="text-xs opacity-70 mt-2.5">{n.article_date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
