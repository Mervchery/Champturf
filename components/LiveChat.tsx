"use client";

import { useState, useEffect } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LiveChat() {
  const [messages, setMessages] = useState<[string, string][]>([
    ["A. Coutinho", "Come on Corsaire!"],
    ["M. Ramful", "Belle Étoile looks strong today"],
    ["V. Teeluck", "Photo finish incoming"],
  ]);
  const [input, setInput] = useState("");
  const [username] = useState(() => `User_${Math.floor(Math.random() * 900) + 100}`);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    // Open a real-time broadcast channel (Uses 0 database space!)
    const chatChannel = supabase.channel("live_chat_room", {
      config: {
        broadcast: { self: true }, // Receive your own messages back
      },
    });

    chatChannel
      .on("broadcast", { event: "chat_message" }, ({ payload }) => {
        setMessages((prev) => [...prev, [payload.sender, payload.message]]);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setChannel(chatChannel);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, []);

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !channel) return;

    const messageText = input;
    setInput("");

    // Broadcast message via WebSockets directly to all online users (No DB write)
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
  );
}

