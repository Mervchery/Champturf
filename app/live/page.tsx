import Link from "next/link";
import { Play } from "lucide-react";
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
        {/* RESPONSIVE GRID */}
        <div className="wrap grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-6 md:gap-8 items-start">
          
          {/* 1. VIDEO PLAYER */}
          <div className="md:col-start-1 md:row-start-1">
            <div className="rounded-xl overflow-hidden shadow-md border border-line bg-black">
              <div className="relative w-full aspect-video bg-black">
                {stream ? (
                  <>
                    {/* Top-Right LIVE Badge */}
                    <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] tracking-widest flex items-center gap-1.5 z-10 pointer-events-none">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                    </div>

                    {/* Bottom-Right TV Channel Logo (Watermark) */}
                    {/* pointer-events-none ensures you can still click video controls underneath it */}
                    <div className="absolute bottom-6 right-6 z-10 pointer-events-none opacity-60 hover:opacity-100 transition-opacity drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      <div className="font-display text-2xl md:text-3xl font-black italic tracking-tighter leading-none flex flex-col">
                        <div>
                          <span className="text-white">CHAMP</span>
                          <span className="text-yellow-400">TURF</span>
                        </div>
                        {/* Green accent bar to complete the White, Gold, and Green theme */}
                        <div className="h-1.5 w-full bg-green-500 mt-1 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.3)]"></div>
                      </div>
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
            </div>
          </div>

          {/* 2. LIVE CHAT */}
          {/* md:sticky md:top-6 ensures it ONLY stays fixed on desktop, and scrolls normally on mobile! */}
          <div className="md:col-start-2 md:row-start-1 md:row-span-2 md:sticky md:top-6">
             <LiveChat />
          </div>

          {/* 3. REPLAY ARCHIVE */}
          <div className="md:col-start-1 md:row-start-2 mt-4 md:mt-0">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-display">Replay archive</h2>
            </div>
            {replays.length === 0 && <p className="text-sm opacity-60">No completed races yet.</p>}
            
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
