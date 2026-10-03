import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, translate, type Lang, type Vars } from "./index";

export function getLang(): Lang {
  return normalizeLang(cookies().get(LANG_COOKIE)?.value);
}

/** For server components: `const { t, lang } = getT();` */
export function getT() {
  const lang = getLang();
  return { lang, t: (key: string, vars?: Vars) => translate(lang, key, vars) };
}
