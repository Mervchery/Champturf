import { fr } from "./fr";

export type Lang = "en" | "fr";
export const LANGS: Lang[] = ["en", "fr"];
export const LANG_COOKIE = "ct-lang";

export function normalizeLang(value?: string | null): Lang {
  return value === "fr" ? "fr" : "en";
}

export type Vars = Record<string, string | number>;

/** English text is the key. French comes from ./fr; anything without an entry
 *  (names, free-text content entered by staff) is shown exactly as stored. */
export function translate(lang: Lang, key: string, vars?: Vars): string {
  // Keys may carry a lowercase namespace ("nat:Mauritian") to keep short words
  // distinct; when there's no translation the prefix is dropped again.
  const plain = key.replace(/^[a-z]+:/, "");
  const raw = lang === "fr" ? fr[key] ?? plain : plain;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : raw;
}

export const dateLocale = (lang: Lang) => (lang === "fr" ? "fr-FR" : "en-GB");

/** "Sunday 4 October 2026" / "dimanche 4 octobre 2026" from a YYYY-MM-DD date. */
export function fmtDateLong(lang: Lang, isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString(dateLocale(lang), {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

/** 1st/2nd/3rd… in English, 1er/2e/3e… in French. */
export function ordinal(lang: Lang, n: number): string {
  if (lang === "fr") return n === 1 ? "1er" : `${n}e`;
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}
