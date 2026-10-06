import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import LanguageSwitch from "@/components/LanguageSwitch";

export default function Footer() {
  const { t } = getT();
  const link = "block text-sm py-1 text-white/75 hover:text-white transition-colors";
  return (
    <footer className="bg-turf text-white/70 pt-12 pb-7 mt-16">
      <div className="wrap flex flex-wrap gap-8 justify-between">
        <div className="max-w-[260px]">
          <div className="flex items-center gap-2.5 mb-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={34} height={34} className="brand-logo" />
            <h2 className="text-white text-sm">Champ Turf</h2>
          </div>
          <p className="text-sm opacity-75 leading-relaxed">
            {t("The independent home of Mauritian horse racing — race data, profiles, and live coverage from Champ de Mars.")}
          </p>
        </div>
        <div>
          <h2 className="text-white text-sm mb-2.5">{t("Explore")}</h2>
          <Link href="/race-days" className={link}>{t("Race calendar")}</Link>
          <Link href="/horses" className={link}>{t("Horses")}</Link>
          <Link href="/jockeys" className={link}>{t("Jockeys")}</Link>
          <Link href="/stats" className={link}>{t("Statistics")}</Link>
        </div>
        <div>
          <h2 className="text-white text-sm mb-2.5">{t("Coverage")}</h2>
          <Link href="/live" className={link}>{t("Live streams")}</Link>
          <Link href="/results" className={link}>{t("Results centre")}</Link>
          <Link href="/news" className={link}>{t("News")}</Link>
        </div>
      </div>
      <div className="wrap flex flex-wrap gap-3 items-center justify-between mt-8 pt-4 border-t border-white/10 text-xs">
        <nav aria-label={t("Legal")} className="w-full flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/privacy" className="tap hover:text-white transition-colors">{t("Privacy Policy")}</Link>
          <Link href="/terms" className="tap hover:text-white transition-colors">{t("Terms of Use")}</Link>
          <Link href="/cookies" className="tap hover:text-white transition-colors">{t("Cookie Policy")}</Link>
          <Link href="/community-guidelines" className="tap hover:text-white transition-colors">{t("Community guidelines")}</Link>
        </nav>
        <span>© 2026 Champ Turf. {t("Independent coverage — not affiliated with the Mauritius Turf Club or any official body.")}</span>
        <LanguageSwitch />
      </div>
    </footer>
  );
}
