"use client";

import { createContext, useContext } from "react";
import { formatOdds, type OddsFormat } from "@/lib/oddsFormat";

const OddsFormatContext = createContext<OddsFormat>("decimal");

export function OddsFormatProvider({ format, children }: { format: OddsFormat; children: React.ReactNode }) {
  return <OddsFormatContext.Provider value={format}>{children}</OddsFormatContext.Provider>;
}

export const useOddsFormat = () => useContext(OddsFormatContext);

/** A price in the visitor's chosen style (decimal or fractional). Never currency-converted. */
export function Odds({ value }: { value: string | number | null | undefined }) {
  const fmt = useOddsFormat();
  return <>{formatOdds(value, fmt) ?? "—"}</>;
}
