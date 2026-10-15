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
  // Exact-ish match first (2.7 → 27/10), then a looser one (so odd prices still get a tidy fraction).
  for (const tol of [0.006, 0.02]) {
    for (const d of DENOMS) {
      const n = Math.round(x * d);
      if (n >= 1 && Math.abs(n / d - x) <= tol) return `${n}/${d}`;
    }
  }
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const n = Math.round(x * 100);
  const k = g(n, 100);
  return `${n / k}/${100 / k}`;
}

// What the stored number means. Supertote prints the money returned for a bet:
//   • before the race ("entry"): Rs 370 back for a Rs 100 bet  → stored 370  → decimal 3.70
//   • on results ("result"):     Rs  20 back for a Rs  10 bet  → stored 20   → decimal 2.00
//   • "decimal": already a decimal (e.g. the model's fair price, 1 / probability)
export type OddsSource = "entry" | "result" | "decimal";
const DIVISOR: Record<OddsSource, number> = { entry: 100, result: 10, decimal: 1 };

/** Stored feed value → decimal odds (stake included, like PMU). Null for empty / placeholder (9999) / zero. */
export function toDecimal(raw: string | number | null | undefined, source: OddsSource = "entry"): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n >= 9999) return null;
  return n / DIVISOR[source];
}

/** 3.7 → "3.7", 2 → "2.0", 3.75 → "3.75": one decimal at least, two at most. */
export const decimalText = (d: number) => (Math.round(d * 100) / 100).toFixed(2).replace(/0$/, "");

/** Format a stored price in the visitor's chosen style. Null when there is no price. */
export function formatOdds(raw: string | number | null | undefined, fmt: OddsFormat = "decimal", source: OddsSource = "entry"): string | null {
  const d = toDecimal(raw, source);
  if (d == null) return null;
  return fmt === "fractional" ? toFraction(d) : decimalText(d);
}
