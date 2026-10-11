"use client";

import Link from "next/link";
import { useT } from "@/components/LanguageProvider";
import type { RaceEntry } from "@/lib/races";

/** Runners that were declared but are no longer in the field (scratched / non-partants). */
export default function ScratchedList({ entries }: { entries: RaceEntry[] }) {
  const { t } = useT();
  if (!entries || entries.length === 0) return null;
  return (
    <div className="panel mt-6">
      <h3 className="font-display text-lg">{t("Scratched runners")}</h3>
      <ul className="mt-3 space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 opacity-70">
            <span className="flex items-center gap-2 min-w-0">
              {e.runner_no != null && <span className="font-mono text-xs">{e.runner_no}</span>}
              {e.horses ? (
                <Link href={`/horses/${e.horses.id}`} className="font-semibold truncate line-through hover:underline">{e.horses.name}</Link>
              ) : (
                <span className="font-semibold line-through">—</span>
              )}
              {e.jockeys?.name && <span className="text-xs truncate">· {e.jockeys.name}</span>}
            </span>
            <span className="pill pill-outline shrink-0">{t("Scratched")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
