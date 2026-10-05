"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown, TrendingUp, Flag, Trophy } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { markAllNotificationsRead, clearNotifications } from "@/lib/actions/follows";
import type { AppNotification } from "@/lib/follows";

function Icon({ kind, title }: { kind: AppNotification["kind"]; title: string }) {
  if (kind === "declared") return <Flag size={16} />;
  if (kind === "result") return <Trophy size={16} />;
  return title.includes("▼") ? <TrendingDown size={16} /> : <TrendingUp size={16} />;
}

export default function NotificationsPanel({ items }: { items: AppNotification[] }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [list, setList] = useState(items);
  const unread = list.filter((n) => !n.read_at).length;

  if (list.length === 0) {
    return <p className="text-sm opacity-65">{t("No alerts yet. When a horse you follow is declared, moves in the betting or runs, it shows up here.")}</p>;
  }

  return (
    <div>
      <div className="flex gap-4 text-xs mb-2">
        {unread > 0 && (
          <button type="button" disabled={pending} className="underline" onClick={() => start(async () => { await markAllNotificationsRead(); setList((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); })}>
            {t("Mark all as read")}
          </button>
        )}
        <button type="button" disabled={pending} className="underline opacity-70" onClick={() => start(async () => { await clearNotifications(); setList([]); router.refresh(); })}>
          {t("Clear all")}
        </button>
      </div>
      <ul className="divide-y divide-[var(--line)]">
        {list.map((n) => {
          const title = lang === "fr" && n.title_fr ? n.title_fr : n.title;
          const body = lang === "fr" && n.body_fr ? n.body_fr : n.body;
          return (
            <li key={n.id}>
              <Link href={n.url} className="flex gap-3 py-3 hover:bg-[var(--line)] -mx-2 px-2 rounded-lg">
                <span className={`mt-0.5 shrink-0 ${n.read_at ? "opacity-40" : "text-coral"}`}><Icon kind={n.kind} title={title} /></span>
                <span className="min-w-0">
                  <span className={`block text-sm ${n.read_at ? "" : "font-semibold"}`}>{title}</span>
                  <span className="block text-xs opacity-70 mt-0.5">{body}</span>
                  <span className="block text-[0.7rem] opacity-45 mt-1">
                    {new Date(n.created_at).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Indian/Mauritius" })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
