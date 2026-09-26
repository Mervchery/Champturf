import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Ticker from "@/components/Ticker";

export const metadata: Metadata = {
  title: "Champ Turf — Mauritius Horse Racing",
  description: "Live results, pedigree records, and race-day coverage for every meeting at Champ de Mars.",
};

// Without this, the root layout (and the Ticker it renders) could be
// cached at build time and not pick up admin edits to ticker_items —
// every other data-driven page in this app already sets revalidate = 0
// for the same reason.
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Header />
        <Ticker />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
