import Link from "next/link";
import { Play, MonitorUp } from "lucide-react";
import { getActiveStream, type Stream } from "@/lib/streams";
import { getRaces } from "@/lib/races";
import LiveChat from "@/components/LiveChat";

export const revalidate = 0;

function renderEmbed(stream: Stream) {
  if (stream.source === "rtmp") {
    return (
      <video 
        className="absolute inset-0 w-full h-full bg-black object-contain" 
        src={stream.embed_url} 
        controls 
        autoPlay 
        muted 
        playsInline 
      />
    );
  }
  return (
    <iframe
      className="absolute inset-0 w-full h-full bg-black"
      src={stream.embed_url}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}

export default async function LivePage() {
  const [stream, races] = await Promise.all([getActiveStream(), getRaces()]);
  const replays = races.filter((r) => r.status === "completed");

  return (
    <div>
      <div className="detail-hero">
        <div className="wrap">
          <span className="text-xs font-semibold text-gold2">BROADCAST</span>
          <h1 className="text-3xl font-display mt-1">Live &amp; replays</h1>
        </div>
      </div>
      
      <section className="py-8 md:py-14">
        {/* RESPONSIVE GRID: 
            Mobile: Stacks as 1 column (1. Video -> 2. Chat -> 3. Replays)
            Desktop: Splits into 2 columns (Video & Replays left, Chat right) */}
        <div className="wrap grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-6 md:gap-8 items-start">
          
          {/* 1. VIDEO PLAYER */}
          <div className="md:col-start-1 md:row-start-1">
            <div className="rounded-xl overflow-hidden shadow-sm border border-line bg-surface">
              {/* aspect-video makes it perfectly scale to any screen size */}
              <div className="relative w-full aspect-video bg-black">
                {stream ? (
                  <>
                    <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] tracking-widest flex items-center gap-1.5 z-10 pointer-events-none">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                    </div>
                    {renderEmbed(stream)}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <div className="text-center p-4">
                      <Play size={28} className="mx-auto opacity-60 mb-2" />
                      <div className="text-sm">No live stream right now — check back during a race day.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Player Footer */}
              <div className="px-4 py-3 bg-background flex flex-wrap gap-4 items-center justify-between border-t border-line">
                <div className="flex items-center gap-3">
                  <div className="font-display text-xl font-black italic tracking-tight">
                    CHAMP<span className="text-coral">TURF</span>
                  </div>
                  <span className="text-xs opacity-50 border-l border-line pl-3 py-0.5 hidden sm:inline-block">
                    Official Broadcast
                  </span>
                </div>
                
                {/* Native Picture-in-Picture indicator */}
                <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 bg-line/30 px-2.5 py-1 rounded">
                  <MonitorUp size={12} />
                  <span className="hidden sm:inline">Supports Picture-in-Picture</span>
                  <span className="sm:hidden">PiP Supported</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. LIVE CHAT */}
          {/* sticky top-6 keeps it visible on desktop as you scroll down the replays */}
          <div className="md:col-start-2 md:row-start-1 md:row-span-2 sticky top-6">
             <LiveChat />
          </div>

          {/* 3. REPLAY ARCHIVE */}
          <div className="md:col-start-1 md:row-start-2 mt-4 md:mt-0">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-display">Replay archive</h2>
            </div>
            {replays.length === 0 && <p className="text-sm opacity-60">No completed races yet.</p>}
            
            {/* Replay grid adapts from 1 column on mobile to 3 on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {replays.map((r) => (
                <Link key={r.id} href={`/races/${r.id}`} className="card hover:border-coral transition-colors">
                  <div className="h-[110px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                    <Play size={22} />
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-semibold truncate">{r.name}</h4>
                    <div className="text-xs opacity-60">{r.race_date}</div>
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
