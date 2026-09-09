// Mirrors public.normalize_name() in scraper_normalization_migration.sql —
// keep these two in sync if either changes. Used to match "D. Schwarz",
// "D Schwarz", and "d.schwarz" to the same person instead of creating
// three separate jockey records.
export function normalizeName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
