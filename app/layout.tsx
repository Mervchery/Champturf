import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getLang } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Ticker from "@/components/Ticker";
import NavProgress from "@/components/NavProgress";

export function generateMetadata(): Metadata {
  const lang = getLang();
  return {
    title: translate(lang, "Champ Turf — Mauritius Horse Racing"),
    description: translate(lang, "Live results, pedigree records, and race-day coverage for every meeting at Champ de Mars."),
  };
}

// Without this, the root layout (and the Ticker it renders) could be
// cached at build time and not pick up admin edits to ticker_items —
// every other data-driven page in this app already sets revalidate = 0
// for the same reason.
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  return (
    <html lang={lang}>
      <body className="font-sans">
        <LanguageProvider lang={lang}>
          <NavProgress />
          <Header />
          <Ticker />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
