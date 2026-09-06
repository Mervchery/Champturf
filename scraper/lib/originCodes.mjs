// Best-effort — Supertote shows origin as a short code in parentheses
// after the horse's name, e.g. "Future Swing (SAF)". Add codes here as you
// encounter unmapped ones; unmapped codes fall back to the raw code.
export const ORIGIN_CODES = {
  SAF: "South Africa",
  FR: "France",
  GB: "Great Britain",
  IRE: "Ireland",
  MRI: "Mauritius",
  MUS: "Mauritius",
  AUS: "Australia",
  NZ: "New Zealand",
  USA: "United States",
  GER: "Germany",
  ZIM: "Zimbabwe",
};

export function resolveOrigin(code) {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return ORIGIN_CODES[trimmed] || trimmed;
}
