import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Cookie Policy — Champ Turf" };

export default function CookiesPage() {
  return (
    <PolicyPage
      current="/cookies"
      title="Cookie Policy"
      intro="Cookies and local storage are small pieces of data saved in your browser. We only use what the site needs to work and to remember your choices — we do not use advertising or tracking cookies."
      sections={[
        {
          title: "What we use",
          body: [
            [
              "Sign-in cookies: set by our authentication provider (Supabase) when you sign in, so you stay signed in. Essential for member features.",
              "Language cookie (ct-lang): remembers whether you chose English or French. Lasts up to one year.",
              "Theme setting (ct-theme): remembers light or dark mode, saved in your browser's local storage.",
            ],
          ],
        },
        {
          title: "Third-party cookies",
          body: ["When you play an embedded live stream or replay, the video platform (for example YouTube) may set its own cookies. We do not control these. Please see the platform's own policy for details."],
        },
        {
          title: "Managing cookies",
          body: ["You can delete or block cookies in your browser settings. If you block the sign-in cookies you will not be able to sign in, and the site will forget your language and theme choices."],
        },
      ]}
    />
  );
}
