// How prices are shown: decimal (4.5, the default) or fractional (7/2). Display only —
// the stored and scraped values stay decimal returns. Separate from the Rs / £ currency
// switch, which only applies to money (prize money, stakes, earnings).
export type OddsFormat = "decimal" | "fractional";
export const ODDS_COOKIE = "ct-odds";

export function normalizeOddsFormat(value?: string | null): OddsFormat {
  return value === "fractional" ? "fractional" : "decimal";
}

// Denominators bookmakers actually use, smallest first, so 2.5 → 3/2 and not 150/100.
const DENOMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 40, 50, 100];

/** Decimal return (stake included) → fractional price: 2.5 → "3/2", 2 → "Evens", 1.25 → "1/4". */
export function toFraction(decimal: number): string {
  const x = decimal - 1; // profit per unit staked
  if (!(x > 0)) return String(Math.round(decimal * 100) / 100);
  if (Math.abs(x - 1) < 0.005) return "Evens";
  const tol = Math.max(0.02, x * 0.015);
  for (const d of DENOMS) {
    const n = Math.round(x * d);
    if (n >= 1 && Math.abs(n / d - x) <= tol) return `${n}/${d}`;
  }
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const n = Math.round(x * 100);
  const k = g(n, 100);
  return `${n / k}/${100 / k}`;
}

/** Format a stored decimal price in the visitor's chosen style. Null for empty / zero. */
export function formatOdds(raw: string | number | null | undefined, fmt: OddsFormat = "decimal"): string | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return String(raw);
  if (n <= 0) return null;
  return fmt === "fractional" ? toFraction(n) : String(Math.round(n * 100) / 100);
}
