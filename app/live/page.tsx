import Link from "next/link";
import { Play, Radio } from "lucide-react";
import { getActiveStream, type Stream } from "@/lib/streams";
import { getRaces } from "@/lib/races";
import LiveChat from "@/components/LiveChat";

export const revalidate = 0;

// Still a static placeholder — unrelated to the real stream wiring below.
// A real version would come from race-day commentary, e.g. inserted rows
// keyed to a race, polled or pushed via Supabase Realtime.
const TICKER = [
  "R4 — Off and running — Corsaire du Nord takes early lead",
  "R4 — 600m: Belle Étoile moves up on the outside",
  "R4 — 200m: Île Royale and Roi des Sables locked together",
  "R4 — Photo finish called",
];

function renderEmbed(stream: Stream) {
  if (stream.source === "rtmp") {
    // Native <video> HLS playback works in Safari; other browsers need
    // hls.js for broad support — add it here if you need that later.
    return <video className="w-full h-full" src={stream.embed_url} controls autoPlay muted playsInline />;
  }
  // youtube / facebook / twitch all work as iframe embeds, as long as
  // embed_url is already in the embeddable form documented in
  // supabase/streams_schema.sql.
  return (
    <iframe
      className="w-full h-full"
      src={stream.embed_url}
      allow="autoplay; encrypted-media; picture-in-picture"
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
      <section className="py-14">
        <div className="wrap grid md:grid-cols-[1.6fr_1fr] gap-8 items-start">
          <div>
            <div className="relative aspect-video bg-black rounded overflow-hidden">
              {stream ? (
                <>
                  <div className="absolute top-3.5 left-3.5 bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10">
                    <Radio size={11} className="animate-pulse" /> LIVE
                  </div>
                  {renderEmbed(stream)}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  <div className="text-center">
                    <Play size={28} className="mx-auto opacity-60" />
                    <div className="text-sm mt-2">No live stream right now — check back during a race day.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="panel mt-5">
              <h4 className="text-sm font-semibold mb-2.5">Live race ticker</h4>
              <div className="font-mono text-sm leading-loose">
                {TICKER.map((t, i) => <div key={i}>&#9656; {t}</div>)}
              </div>
            </div>

            "use client";

import { useState, useEffect } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 1. Define your banned words here (keep them lowercase)
const BANNED_WORDS = ["badword1", "badword2", "spammyurl"];

export default function LiveChat() {
  // Start with a completely empty chat
  const [messages, setMessages] = useState<[string, string][]>([]);
  const [input, setInput] = useState("");
  const [username] = useState(() => `User_${Math.floor(Math.random() * 900) + 100}`);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  
  // Anti-spam states
  const [lastSentTime, setLastSentTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const chatChannel = supabase.channel("live_chat_room", {
      config: { broadcast: { self: true } },
    });

    chatChannel
      .on("broadcast", { event: "chat_message" }, ({ payload }) => {
        setMessages((prev) => {
          // Keep only the last 50 messages so the browser doesn't freeze over time
          const newMessages = [...prev, [payload.sender, payload.message]] as [string, string][];
          return newMessages.slice(-50); 
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setChannel(chatChannel);
      });

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, []);

  // 2. Helper function to check for bad words
  const containsProfanity = (text: string) => {
    const lowerText = text.toLowerCase();
    return BANNED_WORDS.some((word) => lowerText.includes(word));
  };

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(""); // clear previous errors

    const messageText = input.trim();
    if (!messageText || !channel) return;

    // --- ANTI-SPAM & ABUSE CHECKS ---
    
    // Check 1: Length limit
    if (messageText.length > 150) {
      setErrorMessage("Message is too long (max 150 characters).");
      return;
    }

    // Check 2: Cooldown (e.g., 3 seconds between messages)
    const now = Date.now();
    if (now - lastSentTime < 3000) {
      setErrorMessage("You are sending messages too fast. Please wait.");
      return;
    }

    // Check 3: Profanity filter
    if (containsProfanity(messageText)) {
      setErrorMessage("Please keep the chat respectful.");
      return;
    }

    // If it passes all checks, send the message
    setInput("");
    setLastSentTime(now);

    await channel.send({
      type: "broadcast",
      event: "chat_message",
      payload: { sender: username, message: messageText },
    });
  }

  return (
    <div className="card flex flex-col h-[480px]">
      <div className="px-3.5 py-3 border-b border-line text-sm font-semibold flex justify-between items-center">
        <span>Live chat</span>
        <span className="text-xs opacity-75">Posting as: <b>{username}</b></span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3.5 text-sm space-y-2.5">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 italic text-xs">
            Be the first to say something!
          </div>
        ) : (
          messages.map(([user, msg], i) => (
            <div key={i}><b className="text-coral">{user}:</b> {msg}</div>
          ))
        )}
      </div>

      {/* Error message display */}
      {errorMessage && (
        <div className="px-3.5 py-1 text-xs text-red-500 bg-red-500/10 border-t border-red-500/20">
          {errorMessage}
        </div>
      )}

      <form onSubmit={sendChat} className="flex border-t border-line">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something…"
          maxLength={150}
          className="flex-1 border-none px-3.5 py-3 text-sm outline-none bg-transparent"
        />
        <button type="submit" className="px-4 text-coral font-semibold text-sm">Send</button>
      </form>
    </div>
  );
}


            <div className="flex justify-between items-end mt-8 mb-3">
              <h2 className="text-xl font-display">Replay archive</h2>
            </div>
            {replays.length === 0 && <p className="text-sm opacity-60">No completed races yet.</p>}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {replays.map((r) => (
                <Link key={r.id} href={`/races/${r.id}`} className="card">
                  <div className="h-[110px] bg-gradient-to-br from-turf to-turf2 flex items-center justify-center text-white/50">
                    <Play size={22} />
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-semibold">{r.name}</h4>
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
