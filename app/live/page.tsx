import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Play, Radio } from "lucide-react";
import { getActiveStream } from "@/lib/streams";
import { getRaces } from "@/lib/races";
import { getCurrentMeetingDate, getMeetingBoard, toSpotRace, type BoardRace } from "@/lib/raceDay";
import { refreshIntervalSec } from "@/lib/raceState";
import RaceSpotlight from "@/components/RaceSpotlight";
import RaceStrip from "@/components/RaceStrip";
import LiveRefresh from "@/components/LiveRefresh";
import EmptyState from "@/components/EmptyState";
import LiveChat from "@/components/LiveChat";
import StreamPlayer from "@/components/StreamPlayer";
import ViewerCount from "@/components/ViewerCount";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";


export function generateMetadata(): Metadata {
  const { t } = getT();
  return pageMeta({ title: t("Live racing"), description: t("Watch Champ de Mars racing live and replay past races."), path: "/live" });
}

export default async function LivePage() {
  const { t } = getT();
  const nowMs = Date.now();
  const [stream, races, board] = await Promise.all([
    getActiveStream(),
    getRaces(),
    // The race centre is an extra: if it can't load, the stream and replays still do.
    getCurrentMeetingDate(nowMs)
      .then((d) => (d ? getMeetingBoard(d) : ([] as BoardRace[])))
      .catch(() => [] as BoardRace[]),
  ]);
  // Newest first, and capped — the full archive lives in the results centre.
  const replays = races
    .filter((r) => r.status === "completed")
    .sort((a, b) => b.race_date.localeCompare(a.race_date) || b.race_time.localeCompare(a.race_time))
    .slice(0, 24);
  const open = board.filter((b) => b.race.status !== "completed");
  const refreshSec = refreshIntervalSec(open.map((b) => b.race), nowMs);
  const strip = board.map((b) => ({ id: b.race.id, no: b.no, race_date: b.race.race_date, race_time: b.race.race_time, status: b.race.status }));

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">{t("BROADCAST")}</span>
          <h1 className="text-3xl font-display mt-1">{t("Live & replays")}</h1>
          {refreshSec && <div className="mt-4"><LiveRefresh intervalSec={refreshSec} className="on-dark" /></div>}
        </div>
      </div>
      <section className="py-6 md:py-14">
        <div className="wrap grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-6 md:gap-8 items-start">
          {/* Chat: second on mobile (under the stream); right column (sticky) on desktop */}
          <div className="order-3 md:order-none md:col-start-2 md:row-start-1 md:row-span-3 md:sticky md:top-24">
            <LiveChat />
          </div>

          {/* Stream */}
          <div className="order-1 md:order-none md:col-start-1 md:row-start-1">
            <div className="relative aspect-video bg-black rounded overflow-hidden">
              <ViewerCount />
              {stream ? (
                <>
                  <div className="absolute top-3.5 left-3.5 bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10">
                    <Radio size={11} className="animate-pulse" /> {t("LIVE")}
                  </div>
                  <StreamPlayer stream={stream} />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/75">
                  <div className="text-center px-4">
                    <Play size={28} className="mx-auto opacity-70" />
                    <div className="text-sm mt-2">{t("No live stream right now — check back during a race day.")}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Race centre: live race / next race, and the card at a glance */}
          <div className="order-2 md:order-none md:col-start-1 md:row-start-2 space-y-3 min-w-0">
            <RaceSpotlight races={open.map(toSpotRace)} serverNow={nowMs} variant="panel" />
            {strip.length > 0 && <RaceStrip races={strip} serverNow={nowMs} />}
          </div>

          {/* Replays */}
          <div className="order-4 md:order-none md:col-start-1 md:row-start-3">
            <div className="flex justify-between items-end mb-3">
              <h2 className="text-xl font-display">{t("Replay archive")}</h2>
              <Link href="/results" className="text-sm border-b border-ink pb-0.5">{t("All results")} →</Link>
            </div>
            {replays.length === 0 && <EmptyState title={t("No completed races yet.")} hint={t("Replays of finished races will be listed here.")} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {replays.map((r) => (
                <Link key={r.id} href={`/races/${r.id}`} className="card overflow-hidden">
                  <div className="relative h-[110px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/75">
                    {r.youtube_video_id && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://i.ytimg.com/vi/${r.youtube_video_id}/hqdefault.jpg`}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <span
                      className={`relative flex items-center justify-center rounded-full ${
                        r.youtube_video_id ? "w-9 h-9 bg-black/60 text-white" : ""
                      }`}
                    >
                      <Play size={r.youtube_video_id ? 16 : 22} />
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold">{r.name}</h3>
                    <div className="text-xs opacity-70">{r.race_date}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
