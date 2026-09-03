"use client";

import { useEffect, useState } from "react";

export default function Countdown({ target }: { target: string }) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const targetDate = new Date(target).getTime();
    function tick() {
      let diff = Math.max(0, targetDate - Date.now());
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000); diff -= h * 3600000;
      const m = Math.floor(diff / 60000); diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      setParts({ d, h, m, s });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const items: [string, number][] = [["D", parts.d], ["H", parts.h], ["M", parts.m], ["S", parts.s]];

  return (
    <div className="flex gap-3.5 mt-5 pt-4 border-t border-white/15">
      {items.map(([label, value]) => (
        <div key={label} className="text-center">
          <div className="font-mono text-2xl font-semibold text-gold2">{String(value).padStart(2, "0")}</div>
          <div className="text-[0.65rem] text-white/60 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}
