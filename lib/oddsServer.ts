import { cookies } from "next/headers";
import { ODDS_COOKIE, formatOdds, normalizeOddsFormat, type OddsFormat, type OddsSource } from "./oddsFormat";

export function getOddsFormat(): OddsFormat {
  return normalizeOddsFormat(cookies().get(ODDS_COOKIE)?.value);
}

/** Server-component price formatter in the visitor's chosen style (drop-in for fmtOdds). */
export function fmtOddsS(raw: string | number | null | undefined, source: OddsSource = "entry"): string | null {
  return formatOdds(raw, getOddsFormat(), source);
}
