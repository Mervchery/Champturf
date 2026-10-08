"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@/components/LanguageProvider";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  // Surface the failure in the console / any attached monitoring.
  useEffect(() => { console.error(error); }, [error]);
  return (
    <section className="py-20 md:py-24">
      <div className="wrap text-center max-w-md mx-auto">
        <h1 className="font-display text-3xl">{t("Something went wrong")}</h1>
        <p className="text-sm opacity-70 mt-2">{t("We couldn't load this page. Please try again in a moment.")}</p>
        <div className="flex gap-3 justify-center flex-wrap mt-6">
          <button onClick={reset} className="btn btn-dark">{t("Try again")}</button>
          <Link href="/" className="btn btn-outline">{t("Back to home")}</Link>
        </div>
      </div>
    </section>
  );
}
