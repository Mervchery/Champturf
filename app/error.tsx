"use client";

import { useT } from "@/components/LanguageProvider";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT();
  return (
    <section className="py-24">
      <div className="wrap text-center max-w-md mx-auto">
        <h1 className="font-display text-3xl">{t("Something went wrong")}</h1>
        <p className="text-sm opacity-65 mt-2">{t("We couldn't load this page. Please try again in a moment.")}</p>
        <button onClick={reset} className="btn btn-dark mt-6">{t("Try again")}</button>
      </div>
    </section>
  );
}
