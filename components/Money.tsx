"use client";

import { createContext, useContext } from "react";
import { useT } from "@/components/LanguageProvider";
import { FX_FALLBACK_GBP_MUR, formatDividend, formatMoney, type Currency } from "@/lib/currency";

type Ctx = { currency: Currency; rate: number };
const CurrencyContext = createContext<Ctx>({ currency: "MUR", rate: FX_FALLBACK_GBP_MUR });

export function CurrencyProvider({ currency, rate, children }: Ctx & { children: React.ReactNode }) {
  return <CurrencyContext.Provider value={{ currency, rate }}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);

/** Prize money / earnings in the visitor's chosen currency (Rs by default). */
export function Money({ amount }: { amount: number }) {
  const { lang } = useT();
  const { currency, rate } = useCurrency();
  return <>{formatMoney(amount, lang, currency, rate)}</>;
}

/** A result dividend: the feed value x10 (12 → 120), or that amount in £ when chosen. */
export function Dividend({ value }: { value: string | number | null | undefined }) {
  const { lang } = useT();
  const { currency, rate } = useCurrency();
  return <>{formatDividend(value, lang, currency, rate) ?? "—"}</>;
}
