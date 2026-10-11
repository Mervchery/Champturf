import { cookies } from "next/headers";
import { CURRENCY_COOKIE, FX_FALLBACK_GBP_MUR, normalizeCurrency, type Currency } from "./currency";

export function getCurrency(): Currency {
  return normalizeCurrency(cookies().get(CURRENCY_COOKIE)?.value);
}

/** MUR per £1. Fetched (and cached by Next for 6 h, shared by all visitors) only when a
 *  visitor has chosen £ — so the default rupee view never makes an outside request. Any
 *  failure falls back to a fixed rate, so a page never breaks because of the converter. */
export async function getGbpRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/GBP", {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const rate = Number(json?.rates?.MUR);
    // Sanity band: a wildly different number means a bad response, not a real rate.
    if (Number.isFinite(rate) && rate > 40 && rate < 90) return rate;
  } catch {
    /* fall through */
  }
  return FX_FALLBACK_GBP_MUR;
}
