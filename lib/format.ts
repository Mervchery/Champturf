import type { Lang } from "@/lib/i18n";

export function fmtMoney(n: number, lang: Lang = "en") {
  return "Rs " + n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
}
