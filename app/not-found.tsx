import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { HorseIcon } from "@/components/RacingIcons";

export default function NotFound() {
  const { t } = getT();
  return (
    <section className="py-24">
      <div className="wrap text-center max-w-md mx-auto">
        <HorseIcon size={44} className="mx-auto text-gold opacity-80" />
        <h1 className="font-display text-3xl mt-4">{t("Page not found")}</h1>
        <p className="text-sm opacity-65 mt-2">{t("The page you're looking for doesn't exist or has moved.")}</p>
        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          <Link href="/" className="btn btn-dark">{t("Back to home")}</Link>
          <Link href="/race-days" className="btn btn-outline">{t("Race calendar")}</Link>
        </div>
      </div>
    </section>
  );
}
