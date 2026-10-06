"use client";

import { useT } from "@/components/LanguageProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowDown, Lock, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Banned words (keep lowercase). This is a client-side filter only — it
// keeps honest users polite but can't stop someone broadcasting directly,
// so received messages are re-checked below before they're rendered.
const BANNED_WORDS = ["badword1", "badword2", "spammyurl"];

const MAX_LENGTH = 150;
const COOLDOWN_MS = 3000;
const MAX_MESSAGES = 50;

type ChatMessage = {
  id: string;
  clientId: string;
  sender: string;
  message: string;
  sentAt: number;
};

type Status = "connecting" | "live" | "offline";

// crypto.randomUUID() only exists in secure contexts (https or localhost).
// Testing on a phone over http://192.168.x.x would crash without a fallback.
const genId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const containsProfanity = (text: string) => {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
};

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function LiveChat() {
  const { t: tr, lang } = useT();
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [unseen, setUnseen] = useState(0);

  // Chat is members-only. Identity comes from the signed-in account (never a
  // random "User_123"), so messages are tied to a real profile.
  const [auth, setAuth] = useState<"loading" | "out" | "in">("loading");
  const [identity, setIdentity] = useState<{ clientId: string; username: string } | null>(null);

  const lastSentRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { setIdentity(null); setAuth("out"); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (cancelled) return;
      const username = (
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split("@")[0] : "") ||
        "Member"
      ).toString().trim().slice(0, 30);
      setIdentity({ clientId: user.id, username });
      setAuth("in");
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [supabase]);

  // Realtime subscription
  useEffect(() => {
    if (auth !== "in") {
      setChannel(null);
      setMessages([]);
      setStatus("connecting");
      return;
    }
    // `private: true` makes Supabase check the realtime.messages policies in
    // supabase/chat_members_only_migration.sql — so only signed-in users can
    // read or send, even if someone bypasses this UI.
    const chatChannel = supabase.channel("live_chat_room", {
      config: { private: true, broadcast: { self: true, ack: true } },
    });

    chatChannel
      .on("broadcast", { event: "chat_message" }, ({ payload }) => {
        // Never trust incoming payloads: validate shape, length and content.
        if (
          !payload ||
          typeof payload.sender !== "string" ||
          typeof payload.message !== "string" ||
          payload.message.length === 0 ||
          payload.message.length > MAX_LENGTH ||
          payload.sender.length > 30 ||
          containsProfanity(payload.message)
        ) {
          return;
        }
        const incoming: ChatMessage = {
          id: typeof payload.id === "string" ? payload.id : genId(),
          clientId: typeof payload.clientId === "string" ? payload.clientId : "",
          sender: payload.sender,
          message: payload.message,
          sentAt: typeof payload.sentAt === "number" ? payload.sentAt : Date.now(),
        };
        // Keep only the last 50 so the browser doesn't bog down over time.
        setMessages((prev) => [...prev, incoming].slice(-MAX_MESSAGES));
        if (!stickToBottomRef.current) setUnseen((n) => n + 1);
      })
      .subscribe((s, err) => {
        console.log("[LiveChat] channel status:", s, err ?? "");
        if (s === "SUBSCRIBED") {
          setChannel(chatChannel);
          setStatus("live");
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("offline");
        }
      });

    // If we never reach SUBSCRIBED, say so instead of spinning forever
    const timeout = setTimeout(() => {
      setStatus((cur) => (cur === "connecting" ? "offline" : cur));
    }, 8000);

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(chatChannel);
    };
  }, [supabase, auth]);

  // Auto-scroll to newest message, unless the reader scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    stickToBottomRef.current = atBottom;
    if (atBottom) setUnseen(0);
  }, []);

  const jumpToLatest = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    stickToBottomRef.current = true;
    setUnseen(0);
  };

  // Cooldown countdown shown on the send button. An interval (keyed only on
  // "is cooling down") keeps ticking until it reaches zero — re-arming a
  // timeout on [cooldownLeft] stalls, because rounding up can produce the
  // same value again and React skips the re-render.
  const cooling = cooldownLeft > 0;
  useEffect(() => {
    if (!cooling) return;
    const id = setInterval(() => {
      const left = Math.ceil((COOLDOWN_MS - (Date.now() - lastSentRef.current)) / 1000);
      setCooldownLeft(Math.max(0, left));
    }, 250);
    return () => clearInterval(id);
  }, [cooling]);

  // Errors clear themselves
  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(""), 4000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const messageText = input.trim();
    if (!messageText || !channel || !identity) return;

    // --- Anti-spam & abuse checks ---
    if (messageText.length > MAX_LENGTH) {
      setErrorMessage(tr("Message is too long (max {n} characters).", { n: MAX_LENGTH }));
      return;
    }

    const now = Date.now();
    const wait = COOLDOWN_MS - (now - lastSentRef.current);
    if (wait > 0) {
      setErrorMessage(tr("Slow down — you can send again in {s}s.", { s: Math.ceil(wait / 1000) }));
      return;
    }

    if (containsProfanity(messageText)) {
      setErrorMessage(tr("Please keep the chat respectful."));
      return;
    }

    // Passed all checks
    lastSentRef.current = now;
    setCooldownLeft(Math.ceil(COOLDOWN_MS / 1000));
    setInput("");
    stickToBottomRef.current = true; // always show your own message

    const res = await channel.send({
      type: "broadcast",
      event: "chat_message",
      payload: {
        id: genId(),
        clientId: identity.clientId,
        sender: identity.username,
        message: messageText,
        sentAt: now,
      },
    });

    if (res !== "ok") {
      console.error("[LiveChat] send failed:", res);
      // Give the text back and let them retry right away
      setInput(messageText);
      lastSentRef.current = 0;
      setCooldownLeft(0);
      setErrorMessage(tr("Couldn't send — check your connection and try again."));
    }
  }

  const remaining = MAX_LENGTH - input.length;
  const canSend = status === "live" && !!identity && input.trim().length > 0 && cooldownLeft === 0;

  const statusDot =
    status === "live" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-500";
  const statusLabel = status === "live" ? tr("Live") : status === "connecting" ? tr("Connecting…") : tr("Offline");

  if (auth !== "in") {
    return (
      <div className="card no-hover flex flex-col h-[420px] sm:h-[480px] md:h-[560px] overflow-hidden">
        <div className="px-3.5 py-3 border-b border-line flex items-center gap-2 text-sm font-semibold">
          <Lock size={14} className="opacity-70" />
          <span>{tr("Live chat")}</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-6">
          {auth === "loading" ? (
            <span className="text-xs opacity-70">{tr("Connecting…")}</span>
          ) : (
            <div className="max-w-[260px]">
              <span className="mx-auto mb-3 flex items-center justify-center w-11 h-11 rounded-full bg-parchment2">
                <Lock size={18} />
              </span>
              <h2 className="font-display text-lg">{tr("Sign in to join the chat")}</h2>
              <p className="text-sm opacity-70 mt-1.5 mb-5">
                {tr("Live chat is for Champ Turf members. Create a free account or sign in to chat during the races.")}
              </p>
              <div className="grid gap-2.5">
                <Link href="/login?next=/live" className="btn btn-dark w-full justify-center">{tr("Sign in")}</Link>
                <Link href="/login?next=/live&mode=signup" className="btn btn-outline w-full justify-center">{tr("Create an account")}</Link>
              </div>
              <p className="text-xs opacity-70 mt-4">
                <Link href="/community-guidelines" className="tap underline">{tr("Community guidelines")}</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card no-hover flex flex-col h-[420px] sm:h-[480px] md:h-[560px] overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-line flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className={`inline-block w-2 h-2 rounded-full ${statusDot}`} aria-hidden />
          <span>{tr("Live chat")}</span>
          <span className="text-xs font-normal opacity-70">{statusLabel}</span>
        </div>
        <span className="text-xs opacity-75 truncate">
          {identity ? (
            <>{tr("You")}: <b>{identity.username}</b></>
          ) : (
            "\u00A0"
          )}
        </span>
      </div>

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={listRef}
          onScroll={onScroll}
          role="log"
          aria-live="polite"
          aria-label={tr("Live chat messages")}
          className="h-full overflow-y-auto overscroll-contain p-3.5 text-sm space-y-2"
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center opacity-70 text-xs px-6">
              {status === "offline"
                ? tr("Chat is unavailable right now. Please check your connection and refresh.")
                : tr("No messages yet. Say something about the race.")}
            </div>
          ) : (
            messages.map((m) => {
              const mine = identity?.clientId === m.clientId && m.clientId !== "";
              return (
                <div
                  key={m.id}
                  className={`rounded-lg px-2.5 py-1.5 break-words ${mine ? "bg-coral/10" : ""}`}
                >
                  <div className="flex items-baseline gap-2">
                    <b className="text-coral-ink">{mine ? tr("You") : m.sender}</b>
                    <span className="text-[11px] opacity-70">{formatTime(m.sentAt)}</span>
                  </div>
                  <div>{m.message}</div>
                </div>
              );
            })
          )}
        </div>

        {unseen > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-coral text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5"
          >
            <ArrowDown size={12} /> {tr(unseen === 1 ? "{n} new message" : "{n} new messages", { n: unseen })}
          </button>
        )}
      </div>

      {/* Error */}
      {errorMessage && (
        <div role="alert" className="px-3.5 py-1.5 text-xs text-red-700 dark:text-red-400 bg-red-500/10 border-t border-red-500/20">
          {errorMessage}
        </div>
      )}

      {/* Composer — text-base on mobile stops iOS from zooming on focus */}
      <form onSubmit={sendChat} className="flex items-center border-t border-line">
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={status === "live" ? tr("Say something…") : tr("Connecting…")}
            maxLength={MAX_LENGTH}
            disabled={status !== "live"}
            autoComplete="off"
            enterKeyHint="send"
            aria-label={tr("Chat message")}
            className="w-full border-none pl-3.5 pr-10 py-3 text-base sm:text-sm outline-none bg-transparent disabled:opacity-50"
          />
          {remaining <= 30 && (
            <span
              className={`absolute right-2 top-1/2 -translate-y-1/2 text-[11px] tabular-nums ${
                remaining <= 10 ? "text-red-700 dark:text-red-400" : "opacity-70"
              }`}
              aria-hidden
            >
              {remaining}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label={tr("Send message")}
          className="px-4 py-3 text-coral-ink font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40 min-w-[64px] justify-center"
        >
          {cooldownLeft > 0 ? `${cooldownLeft}s` : (<><Send size={14} /> {tr("Send")}</>)}
        </button>
      </form>
      <div className="px-3.5 py-0.5 border-t border-line text-[11px] opacity-70">
        <Link href="/community-guidelines" className="tap underline">{tr("Community guidelines")}</Link>
      </div>
    </div>
  );
}
