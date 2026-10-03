import { getT } from "@/lib/i18n/server";
import { Diamond } from "lucide-react";
import { getTickerItems } from "@/lib/ticker";

// Content is managed in the admin panel's "Ticker" section (see
// components/AdminDashboard.tsx / lib/ticker.ts) rather than hardcoded
// here — this component just renders whatever's currently in
// ticker_items, in order.

export default async function Ticker() {
  const { t, lang } = getT();
  const items = await getTickerItems();
  const texts = items.length > 0 ? items.map((i) => i.text) : [t("Champ Turf — Mauritius horse racing")];
  const doubled = [...texts, ...texts];

  return (
    <div className="bg-gold2 text-ink overflow-hidden whitespace-nowrap border-y border-black/5">
      <div className="inline-flex gap-10 py-2.5 animate-[scroll_32s_linear_infinite]">
        {doubled.map((t, i) => (
          <span key={i} className="text-xs font-semibold inline-flex items-center gap-2">
            <Diamond size={10} fill="currentColor" />
            {t}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}
