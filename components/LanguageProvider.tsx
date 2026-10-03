"use client";

import { createContext, useContext, useMemo } from "react";
import { translate, type Lang, type Vars } from "@/lib/i18n";

type Ctx = { lang: Lang; t: (key: string, vars?: Vars) => string };
const LanguageContext = createContext<Ctx>({ lang: "en", t: (k, v) => translate("en", k, v) });

export function LanguageProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => ({ lang, t: (key, vars) => translate(lang, key, vars) }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** For client components: `const { t, lang } = useT();` */
export const useT = () => useContext(LanguageContext);
