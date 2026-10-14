// Display currency. Everything in the database is in Mauritian rupees (MUR) — prize money,
// earnings and the tote prices. Visitors can choose to *view* amounts in pounds sterling (GBP);
// nothing stored or scraped is ever converted. Pure helpers, safe on server and client.
import type { Lang } from "@/lib/i18n";

export type Currency = "MUR" | "GBP";
export const CURRENCY_COOKIE = "ct-currency";

/** Used only if the live rate can't be fetched (about 62–63 MUR per £ in 2026). */
export const FX_FALLBACK_GBP_MUR = 62.5;

export function normalizeCurrency(value?: string | null): Currency {
  return value === "GBP" ? "GBP" : "MUR";
}

const locale = (lang: Lang) => (lang === "fr" ? "fr-FR" : "en-US");

/** Prize money / earnings: "Rs 25,000" or "£400". `rate` = MUR per £1. */
export function formatMoney(n: number, lang: Lang, currency: Currency, rate: number): string {
  if (currency === "GBP" && rate > 0) return "£" + Math.round(n / rate).toLocaleString(locale(lang));
  return "Rs " + n.toLocaleString(locale(lang));
}

