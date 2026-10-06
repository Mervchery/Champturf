"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { useT } from "@/components/LanguageProvider";

const OPTIONS: { code: Lang; label: string; full: string }[] = [
  { code: "en", label: "EN", full: "English" },
  { code: "fr", label: "FR", full: "Français" },
];

/** EN | FR toggle. Stores the choice in a cookie so server-rendered pages
 *  pick it up too, then refreshes the current route in place. */
export default function LanguageSwitch() {
  const { lang, t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(code: Lang) {
    if (code === lang) return;
    document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className={`lang-switch ${pending ? "is-pending" : ""}`} role="group" aria-label={t("Language")}>
      <Globe size={14} className="opacity-70" aria-hidden="true" />
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => choose(o.code)}
          aria-pressed={lang === o.code}
          title={o.full}
          lang={o.code}
          className={`lang-btn ${lang === o.code ? "is-active" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
