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

/** Result dividends. The feed gives the per-unit figure (12, 43); the site shows it x10
 *  (120, 430) — in rupees, or converted to pounds when the visitor picks £. */
export function formatDividend(raw: string | number | null | undefined, lang: Lang, currency: Currency, rate: number): string | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return String(raw);
  if (n <= 0) return null; // a 0 from the feed means "no dividend", not Rs 0 / £0.00
  const mur = n * 10;
  if (currency === "GBP" && rate > 0) return "£" + (mur / rate).toLocaleString(locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(Math.round(mur * 100) / 100);
}
