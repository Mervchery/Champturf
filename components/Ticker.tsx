import { Diamond } from "lucide-react";

const ITEMS = [
  "R7 Race 3 — Île Royale wins by 1¾L",
  "Weights declared — Coupe d'Or de Maurice, Sat 15:30",
  "T. Govinden tops jockey standings this month",
  "Track condition: Good — Champ de Mars",
  "Domaine Coralie confirms 3 entries for Trophée Vallée Verte",
];

export default function Ticker() {
  const doubled = [...ITEMS, ...ITEMS];
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
