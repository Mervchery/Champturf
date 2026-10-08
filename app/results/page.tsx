import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Flag } from "lucide-react";
import ResultsSearch, { type ResultItem } from "@/components/ResultsSearch";
import { ResultCard } from "@/components/Podium";
import EmptyState from "@/components/EmptyState";
import LiveRefresh from "@/components/LiveRefresh";
import { getResultDates, getResultsForDates } from "@/lib/raceDay";
import { fmtDateLong } from "@/lib/i18n";
import { mauritiusDate } from "@/lib/raceState";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Results"), description: t("Race results from Champ de Mars — finishing order, times and dividends."), path: "/results" });
}

// How many race days to show at once, and how far "Show earlier meetings" steps back.
const DEFAULT_DAYS = 3;
const STEP = 6;
const MAX_DAYS = 60;

export default async function ResultsPage({ searchParams }: { searchParams: { date?: string; days?: string } }) {
  const { t, lang } = getT();

  const allDates = await getResultDates(MAX_DAYS);
  const wanted = (searchParams.date ?? "").trim();
  const days = Math.min(MAX_DAYS, Math.max(DEFAULT_DAYS, Number.parseInt(searchParams.days ?? "", 10) || DEFAULT_DAYS));

  // One meeting when ?date= is given and valid, otherwise the latest few.
  const single = wanted && allDates.includes(wanted) ? wanted : null;
  const dates = single ? [single] : allDates.slice(0, days);
  const races = await getResultsForDates(dates);

  const items: ResultItem[] = races.map((r) => ({
    id: r.id,
    date: r.race_date,
    search: r.search,
    node: <ResultCard race={r} />,
  }));

  const hasMore = !single && allDates.length > dates.length;
  const today = mauritiusDate(Date.now());
  const showsToday = dates.includes(today);
  const chips = allDates.slice(0, 10);

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("RESULTS CENTRE")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Race results")}</h1>
          <p className="text-white/70 text-sm mt-2 max-w-[52ch]">{t("First three home in every race, with jockey, trainer, odds and winning time.")}</p>
          {showsToday && <div className="mt-4"><LiveRefresh intervalSec={45} className="on-dark" /></div>}
        </div>
      </div>

      {chips.length > 0 && (
        <nav aria-label={t("Race days")} className="race-strip">
          <div className="race-strip-scroll no-scrollbar">
            <Link href="/results" className={`race-chip ${!single ? "is-current" : ""}`}>
              <span className="race-chip-no">{t("Latest")}</span>
            </Link>
            {chips.map((d) => (
              <Link key={d} href={`/results?date=${d}`} className={`race-chip ${single === d ? "is-current" : ""}`}>
                <span className="race-chip-no">{new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      <section className="py-6 md:py-12">
        <div className="wrap">
          {single && (
            <p className="text-sm mb-4 opacity-80">
              {fmtDateLong(lang, single)} · <Link href="/results" className="underline underline-offset-2">{t("Back to latest results")}</Link>
            </p>
          )}

          {items.length === 0 ? (
            <EmptyState
              icon={<Flag size={22} />}
              title={t("No results yet.")}
              hint={t("Results appear here as soon as each race is official.")}
              action={{ href: "/race-days", label: t("See the race calendar") }}
            />
          ) : (
            <ResultsSearch items={items} />
          )}

          {hasMore && (
            <div className="text-center mt-4">
              <Link href={`/results?days=${Math.min(MAX_DAYS, days + STEP)}`} className="btn btn-outline">{t("Show earlier meetings")}</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
