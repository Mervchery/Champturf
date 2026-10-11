import { getT } from "@/lib/i18n/server";
import type { SeasonRow } from "@/lib/season";

/** Wins and results for every season, newest first. The current season is highlighted. */
export default function SeasonHistory({ rows, kind, currentYear }: { rows: SeasonRow[]; kind: "jockey" | "trainer"; currentYear: number }) {
  const { t } = getT();
  if (rows.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="font-display text-xl mb-4">{t("Season by season")}</h2>
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>{t("Season")}</th><th>{kind === "jockey" ? t("Rides") : t("Runners")}</th><th>{t("Wins")}</th><th>{t("Placed")}</th><th>{t("Win %")}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.season} className={r.season === currentYear ? "font-semibold" : undefined}>
                <td data-title>{r.season}{r.season === currentYear && <span className="pill pill-gold ml-2">{t("Current")}</span>}</td>
                <td data-label={kind === "jockey" ? t("Rides") : t("Runners")}>{r.runs}</td>
                <td data-label={t("Wins")}>{r.wins}</td>
                <td data-label={t("Placed")}>{r.places}</td>
                <td data-label={t("Win %")}>{r.runs > 0 ? Math.round((r.wins / r.runs) * 1000) / 10 : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
