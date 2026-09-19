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
