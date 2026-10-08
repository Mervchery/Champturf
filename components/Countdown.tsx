"use client";

import { useT } from "@/components/LanguageProvider";
import { useNow } from "@/lib/useNow";
import { MU_OFFSET } from "@/lib/raceState";

/** Accepts a full ISO timestamp, or a bare "YYYY-MM-DDTHH:MM:SS" which is read as
 *  Mauritius time (not the visitor's own time zone). */
function targetMs(target: string): number {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(target);
  return Date.parse(hasZone ? target : target + MU_OFFSET);
}

type Props = {
  target: string;
  /** "hero" = big boxed digits (default, as in v8); "compact" = one inline line. */
  variant?: "hero" | "compact";
  /** Server timestamp, so the first paint already shows the right digits. */
  serverNow?: number;
};

export default function Countdown({ target, variant = "hero", serverNow }: Props) {
  const { t } = useT();
  const now = useNow(serverNow ?? 0, 1000);
  // Without a server timestamp the first render is a placeholder; the clock fills in after mount.
  const ready = serverNow != null || now > 0;
  const diff = ready ? Math.max(0, targetMs(target) - now) : 0;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (ready && diff === 0) {
    return <div className={variant === "hero" ? "mt-5 pt-4 border-t border-white/15 font-semibold text-gold2" : "font-semibold"}>{t("Off")}</div>;
  }

  if (variant === "compact") {
    const text = !ready ? "--:--" : d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${pad(m)}:${pad(s)}`;
    return <span className="font-mono tabular-nums font-semibold" aria-label={t("Time until the off")}>{text}</span>;
  }

  const items: [string, number][] = [["D", d], ["H", h], ["M", m], ["S", s]];
  return (
    <div className="flex gap-3.5 mt-5 pt-4 border-t border-white/15" role="timer" aria-label={t("Time until the off")}>
      {items.map(([label, value]) => (
        <div key={label} className="text-center min-w-[2.2rem]">
          <div className="font-mono text-2xl font-semibold text-gold2 tabular-nums">{ready ? pad(value) : "--"}</div>
          <div className="text-[0.65rem] text-white/75 mt-0.5">{t(label)}</div>
        </div>
      ))}
    </div>
  );
}
