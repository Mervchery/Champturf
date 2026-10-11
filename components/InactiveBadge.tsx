import { getT } from "@/lib/i18n/server";

/** Grey "not active this season" marker for trainers and jockeys who haven't appeared in the current season. */
export default function InactiveBadge({ year, kind, small = false }: { year: number; kind: "jockey" | "trainer"; small?: boolean }) {
  const { t } = getT();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-gray-400/50 bg-gray-400/20 text-gray-600 dark:text-gray-300 font-semibold uppercase tracking-wide ${small ? "text-[0.6rem] px-1.5 py-0.5" : "text-[0.68rem] px-2 py-0.5"}`}
      title={kind === "jockey" ? t("No rides in {y}", { y: String(year) }) : t("No runners in {y}", { y: String(year) })}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" aria-hidden="true" />
      {t("Inactive")} · {year}
    </span>
  );
}
