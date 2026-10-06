"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import SilkImage from "@/components/SilkImage";
import { useT } from "@/components/LanguageProvider";
import { setFollowPrefs, toggleFollow } from "@/lib/actions/follows";

type Item = { horse_id: string; notify_runs: boolean; notify_odds: boolean; horse: { id: string; name: string; silk_image_url: string | null } | null };

export default function FollowedHorsesList({ initial }: { initial: Item[] }) {
  const { t } = useT();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();

  function setPref(horseId: string, key: "notify_runs" | "notify_odds", value: boolean) {
    setItems((xs) => xs.map((x) => (x.horse_id === horseId ? { ...x, [key]: value } : x)));
    start(async () => { await setFollowPrefs(horseId, { [key]: value }); });
  }
  function unfollow(horseId: string) {
    const before = items;
    setItems((xs) => xs.filter((x) => x.horse_id !== horseId));
    start(async () => {
      const res = await toggleFollow(horseId);
      // toggleFollow flips state; if it somehow re-followed, restore the list from the server's answer.
      if (!res.ok || res.following) setItems(before);
    });
  }

  if (items.length === 0) {
    return <p className="text-sm opacity-70">{t("You're not following any horses yet. Open a horse or a race card and tap Follow.")}</p>;
  }

  return (
    <ul className="divide-y divide-[var(--line)]">
      {items.map((it) => (
        <li key={it.horse_id} className="py-3 flex items-center gap-3 flex-wrap">
          <SilkImage url={it.horse?.silk_image_url} title={it.horse?.name} size={36} fallback />
          <div className="min-w-0 flex-1">
            {it.horse ? <Link href={`/horses/${it.horse.id}`} className="font-semibold hover:underline">{it.horse.name}</Link> : <span className="opacity-70">{t("Unknown")}</span>}
            <div className="flex gap-4 mt-1 text-xs">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={it.notify_runs} disabled={pending} onChange={(e) => setPref(it.horse_id, "notify_runs", e.target.checked)} />
                {t("Runs & results")}
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={it.notify_odds} disabled={pending} onChange={(e) => setPref(it.horse_id, "notify_odds", e.target.checked)} />
                {t("Odds moves")}
              </label>
            </div>
          </div>
          <button type="button" onClick={() => unfollow(it.horse_id)} disabled={pending} aria-label={t("Stop alerts for {name}", { name: it.horse?.name ?? "" })} className="p-2 rounded-full hover:bg-[var(--line)] opacity-70 disabled:opacity-40">
            <X size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}

