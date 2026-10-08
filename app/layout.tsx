import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getLang } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Ticker from "@/components/Ticker";
import NavProgress from "@/components/NavProgress";
import MobileTabBar from "@/components/MobileTabBar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { siteUrl } from "@/lib/site";

// Fonts are self-hosted at build time by next/font instead of being pulled in with
// a CSS @import from fonts.googleapis.com. That removes the render-blocking
// stylesheet chain, lets the browser preload the files, and — the important part
// for layout shift — next/font generates a fallback face with size-adjust /
// ascent / descent overrides, so text set in the fallback occupies the same space
// as the real font and nothing reflows when the web font arrives.
const display = Fraunces({ subsets: ["latin"], axes: ["opsz"], display: "swap", variable: "--font-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-mono" });

export function generateMetadata(): Metadata {
  const lang = getLang();
  const title = translate(lang, "Champ Turf — Mauritius Horse Racing");
  const description = translate(lang, "Live results, pedigree records, and race-day coverage for every meeting at Champ de Mars.");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: "%s · Champ Turf" },
    description,
    applicationName: "Champ Turf",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "Champ Turf",
      title,
      description,
      locale: lang === "fr" ? "fr_MU" : "en_MU",
      // The share image itself comes from app/opengraph-image.tsx
    },
    twitter: { card: "summary_large_image", title, description },
    appleWebApp: { capable: true, title: "Champ Turf", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#123c2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Caching note: this layout reads the language cookie, so pages are rendered per
// request. What is cached (30s, shared between all visitors) is the DATA — every
// public read goes through lib/supabase/public.ts. Do not add
// `export const revalidate = 0` or `dynamic = "force-dynamic"` to a page: either
// one switches that data cache off again.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  return (
    <html lang={lang} className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans">
        <LanguageProvider lang={lang}>
          <NavProgress />
          <ServiceWorkerRegister />
          <Header />
          <Ticker />
          <main>{children}</main>
          <Footer />
          <MobileTabBar />
        </LanguageProvider>
      </body>
    </html>
  );
}
