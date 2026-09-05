"use client";

import { useState } from "react";

const CHAT_SEED: [string, string][] = [
  ["A. Coutinho", "Come on Corsaire!"],
  ["M. Ramful", "Belle Étoile looks strong today"],
  ["V. Teeluck", "Photo finish incoming"],
];

export default function LiveChat() {
  const [messages, setMessages] = useState(CHAT_SEED);
  const [input, setInput] = useState("");

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((m) => [...m, ["You", input]]);
    setInput("");
  }

  return (
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
  );
}
