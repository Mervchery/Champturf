"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Coins } from "lucide-react";
import { CURRENCY_COOKIE, type Currency } from "@/lib/currency";
import { useT } from "@/components/LanguageProvider";
import { useCurrency } from "@/components/Money";

const OPTIONS: { code: Currency; label: string; full: string }[] = [
  { code: "MUR", label: "Rs", full: "Mauritian rupee" },
  { code: "GBP", label: "£", full: "Pound sterling" },
];

/** Rs | £ toggle. Same mechanics as the language switch: a cookie, then an in-place refresh
 *  so server-rendered amounts pick it up. */
export default function CurrencySwitch({ className = "" }: { className?: string }) {
  const { t } = useT();
  const { currency, rate } = useCurrency();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(code: Currency) {
    if (code === currency) return;
    document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={`lang-switch ${pending ? "is-pending" : ""} ${className}`}
      role="group"
      aria-label={t("Currency")}
      title={currency === "GBP" ? t("Approximate rate: £1 = Rs {n}", { n: rate.toFixed(2) }) : t("Show amounts in pounds (£)")}
    >
      <Coins size={14} className="opacity-70" aria-hidden="true" />
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => choose(o.code)}
          aria-pressed={currency === o.code}
          title={o.full}
          className={`lang-btn ${currency === o.code ? "is-active" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
