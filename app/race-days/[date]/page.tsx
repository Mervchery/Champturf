import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { getMeetingInfo } from "@/lib/meetings";
import { getRacesForDate, pickFeaturedRace } from "@/lib/races";
import { fmtMoney } from "@/lib/format";
import { fmtDateLong } from "@/lib/i18n";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export async function generateMetadata({ params }: { params: { date: string } }): Promise<Metadata> {
  const { t, lang } = getT();
  const races = await getRacesForDate(params.date);
  if (races.length === 0) return { title: t("Race day not found"), robots: { index: false } };
  const label = fmtDateLong(lang, params.date);
  const done = races.every((r) => r.status === "completed");
  return pageMeta({
    title: `${t("Race day")} ${label} — Champ de Mars`,
    description: `${races.length} ${t("races")} · ${label}. ${done ? t("Full results and dividends.") : t("Race cards, runners and live odds movement.")}`,
    path: `/race-days/${params.date}`,
  });
}

export default async function RaceDayPage({ params }: { params: { date: string } }) {
  const { t, lang } = getT();
  const [races, meeting] = await Promise.all([
    getRacesForDate(params.date),
    getMeetingInfo(params.date),
  ]);

  if (races.length === 0) return notFound();

  const totalPrize = races.reduce((sum, r) => sum + (r.prize ?? 0), 0);
  const dateLabel = fmtDateLong(lang, params.date);
  // races is already ordered by race_time (see getRacesForDate) — Race 6
  // of the day, by local convention, not the biggest purse.
  const featured = pickFeaturedRace(races);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("RACE DAY")}</span>
          <h1 className="text-3xl font-display mt-1">{dateLabel}</h1>
          <div className="text-white/70 text-sm mt-2">{meeting?.course ?? races[0].course}</div>
        </div>
      </div>

      <section className="py-10">
        <div className="wrap">
          <Link href="/race-days" className="inline-block text-sm border-b border-ink pb-1">← {t("All race days")}</Link>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-10">
            <div className="stat-tile"><div className="v">{races.length}</div><div className="l">{t("Races")}</div></div>
            <div className="stat-tile"><div className="v">{fmtMoney(totalPrize, lang)}</div><div className="l">{t("Total prize money")}</div></div>
            <div className="stat-tile"><div className="v">{meeting?.weather ?? t("N/A")}</div><div className="l">{t("Weather")}</div></div>
            <div className="stat-tile"><div className="v">{meeting?.track_condition ?? t("N/A")}</div><div className="l">{t("Track condition")}</div></div>
          </div>

          {featured && (
            <div className="panel mb-10 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-gold2 flex items-center justify-center shrink-0">
                <Trophy size={20} className="text-ink" />
              </div>
              <div>
                <span className="text-xs font-semibold opacity-70">{t("FEATURED RACE")}</span>
                <div className="font-display text-lg leading-snug">{featured.name}</div>
                <div className="text-xs opacity-70 mt-0.5">{featured.distance} · {fmtMoney(featured.prize, lang)}</div>
              </div>
            </div>
          )}

          <h2 className="font-display text-2xl mb-5">{t("Races on this card")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {races.map((r, i) => (
              <Link key={r.id} href={`/races/${r.id}`} className="card p-5 flex items-start gap-4">
                <div className="runner-number !w-10 !h-10 !text-sm shrink-0 mt-2">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`pill ${r.status === "upcoming" ? "pill-gold" : "pill-outline"}`}>{r.race_time}</span>
                    {r.status === "completed" && <span className="pill">{t("Result in")}</span>}
                  </div>
                  <div className="font-display text-base mt-1.5 truncate">{r.name}</div>
                  <div className="text-xs opacity-70 mt-0.5">{r.distance} · {fmtMoney(r.prize, lang)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
