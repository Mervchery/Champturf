import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { CalendarDays, Flag, CloudSun } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { getRaceDays } from "@/lib/meetings";
import { fmtDateLong } from "@/lib/i18n";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Race days"), description: t("Every race meeting at Champ de Mars — upcoming race cards and past results."), path: "/race-days" });
}

export default async function RaceDaysPage() {
  const { t, lang } = getT();
  const days = await getRaceDays();
  const upcoming = days.filter((d) => d.status !== "completed");
  const completed = days.filter((d) => d.status === "completed");

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap relative">
          <span className="text-xs font-semibold text-gold2">{t("MEETINGS")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Race days")}</h1>
          <p className="text-white/70 text-sm mt-2 max-w-[52ch]">
            {t("Every meeting at Champ de Mars, grouped by race day — pick a date to see the full card.")}
          </p>
        </div>
      </div>

      <section className="py-12">
        <div className="wrap">
          {upcoming.length > 0 && (
            <>
              <h2 className="font-display text-2xl mb-5">{t("Upcoming")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
                {upcoming.map((d) => <RaceDayCard key={d.race_date} day={d} />)}
              </div>
            </>
          )}

          {completed.length > 0 && (
            <>
              <h2 className="font-display text-2xl mb-5">{t("Past meetings")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {completed.map((d) => <RaceDayCard key={d.race_date} day={d} />)}
              </div>
            </>
          )}

          {days.length === 0 && <p className="text-sm opacity-60">{t("No race days yet.")}</p>}
        </div>
      </section>
    </div>
  );
}

function RaceDayCard({ day }: { day: Awaited<ReturnType<typeof getRaceDays>>[number] }) {
  const { t, lang } = getT();
  const dateLabel = fmtDateLong(lang, day.race_date);

  return (
    <Link href={`/race-days/${day.race_date}`} className="card fade-in p-5 block">
      <div className="flex items-center justify-between mb-3">
        <span className={`pill ${day.status === "upcoming" ? "pill-gold" : "pill-outline"}`}>
          {day.status === "mixed" ? t("In progress") : day.status === "upcoming" ? t("Upcoming") : t("Completed")}
        </span>
        <CalendarDays size={16} className="opacity-40" />
      </div>
      <h3 className="font-display text-lg leading-snug">{dateLabel}</h3>
      <div className="text-sm opacity-60 mt-1">{day.course}</div>
      <div className="flex items-center gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1.5 opacity-70"><Flag size={13} /> {t(day.raceCount === 1 ? "{n} race" : "{n} races", { n: day.raceCount })}</span>
        {day.weather && <span className="flex items-center gap-1.5 opacity-70"><CloudSun size={13} /> {day.weather}</span>}
      </div>
      <div className="mt-3 font-mono text-sm font-semibold">{fmtMoney(day.totalPrize, lang)} <span className="font-sans font-normal opacity-50 text-xs">{t("total purse")}</span></div>
    </Link>
  );
}
