"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Play, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Race } from "@/lib/races";

const SOURCES = ["YouTube", "Facebook Live", "Twitch", "Custom RTMP/HLS"];
const TICKER = [
  "R4 — Off and running — Corsaire du Nord takes early lead",
  "R4 — 600m: Belle Étoile moves up on the outside",
  "R4 — 200m: Île Royale and Roi des Sables locked together",
  "R4 — Photo finish called",
];
const CHAT_SEED: [string, string][] = [
  ["A. Coutinho", "Come on Corsaire!"],
  ["M. Ramful", "Belle Étoile looks strong today"],
  ["V. Teeluck", "Photo finish incoming"],
];

export default function LivePage() {
  const [source, setSource] = useState(SOURCES[0]);
  const [messages, setMessages] = useState(CHAT_SEED);
  const [input, setInput] = useState("");
  const [races, setRaces] = useState<Race[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("races")
      .select("*")
      .eq("status", "completed")
      .order("race_date", { ascending: false })
      .then(({ data }) => setRaces(data ?? []));
  }, []);

  const replays = races;

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((m) => [...m, ["You", input]]);
    setInput("");
  }

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
            <div className="relative aspect-video bg-black rounded flex items-center justify-center text-white/50 overflow-hidden">
              <div className="absolute top-3.5 left-3.5 bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <Radio size={11} className="animate-pulse" /> LIVE
              </div>
              <div className="text-center">
                <Play size={32} className="mx-auto" />
                <div className="text-sm mt-1.5">Simulated stream — Race 4, Champ de Mars</div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap mt-3">
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs ${source === s ? "bg-turf text-white border-turf" : "bg-surface border-line"}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="panel mt-5">
              <h4 className="text-sm font-semibold mb-2.5">Live race ticker</h4>
              <div className="font-mono text-sm leading-loose">
                {TICKER.map((t, i) => <div key={i}>&#9656; {t}</div>)}
              </div>
            </div>

            <div className="flex justify-between items-end mt-8 mb-3">
              <h2 className="text-xl font-display">Replay archive</h2>
            </div>
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

          <div className="card flex flex-col h-[480px]">
            <div className="px-3.5 py-3 border-b border-line text-sm font-semibold">Live chat</div>
            <div className="flex-1 overflow-y-auto p-3.5 text-sm space-y-2.5">
              {messages.map(([user, msg], i) => (
                <div key={i}><b className="text-coral">{user}:</b> {msg}</div>
              ))}
            </div>
            <form onSubmit={sendChat} className="flex border-t border-line">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Say something…"
                className="flex-1 border-none px-3.5 py-3 text-sm outline-none bg-transparent"
              />
              <button type="submit" className="px-4 text-coral font-semibold text-sm">Send</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
