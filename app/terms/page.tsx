import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Terms of Use — Champ Turf" };

export default function TermsPage() {
  return (
    <PolicyPage
      current="/terms"
      title="Terms of Use"
      intro="By using Champ Turf you agree to these terms. If you do not agree, please do not use the site."
      sections={[
        {
          title: "About Champ Turf",
          body: ["Champ Turf is an independent source of Mauritian horse racing information. We are not affiliated with, endorsed by, or connected to the Mauritius Turf Club, the Gambling Regulatory Authority or any other official body."],
        },
        {
          title: "Information only — not betting advice",
          body: [
            "Race cards, results, odds, statistics, tips and other content are provided for information and entertainment. We try to keep them accurate, but we collect data from third-party sources and errors or delays can happen. Always check official sources before relying on any information.",
            "Champ Turf does not accept bets and does not offer gambling services. Nothing on the site is a recommendation to place a bet. If you choose to gamble, do so only with licensed operators, only if you are of legal age, and only with money you can afford to lose. If gambling is causing you problems, please seek help.",
          ],
        },
        {
          title: "Accounts",
          body: [
            [
              "You must be 18 or over to create an account.",
              "Give accurate information and keep your password secure. You are responsible for activity on your account.",
              "One person, one account. Do not share your account or pretend to be someone else.",
            ],
            "You can close your account at any time by contacting us.",
          ],
        },
        {
          title: "Live chat and your content",
          body: [
            "Live chat is available to signed-in members. You are responsible for what you post, and you agree to follow our Community guidelines.",
            "You keep ownership of what you write, but you give us permission to display it on the site for the purpose of running the chat.",
            "We may remove messages, restrict chat access, or suspend or close accounts that break these terms or the Community guidelines, with or without notice.",
          ],
        },
        {
          title: "Acceptable use",
          body: [
            "You agree not to:",
            [
              "Break the law or encourage others to.",
              "Scrape, copy or republish large amounts of the site's data, or overload the site with automated requests.",
              "Try to gain unauthorised access to the site, other accounts or our systems.",
              "Upload malware or interfere with how the site works.",
            ],
          ],
        },
        {
          title: "Intellectual property",
          body: ["The Champ Turf name, logo, design and original content belong to us or our licensors. Horse, jockey, trainer and stable names, silks and race data belong to their respective owners. You may view and share links to the site for personal use, but you may not reuse our content commercially without permission."],
        },
        {
          title: "Third-party content and links",
          body: ["The site includes live streams, videos and links provided by third parties. We do not control and are not responsible for their content or availability."],
        },
        {
          title: "Availability and liability",
          body: [
            "The site is provided \"as is\" and \"as available\". We do not promise it will always be uninterrupted or error-free, especially during live race days.",
            "To the fullest extent permitted by law, Champ Turf is not liable for any loss arising from your use of the site or from relying on its information, including any betting losses. Nothing in these terms limits liability that cannot be limited by law.",
          ],
        },
        {
          title: "Changes and governing law",
          body: [
            "We may update these terms from time to time. Continuing to use the site after a change means you accept the new terms.",
            "These terms are governed by the laws of the Republic of Mauritius, and the courts of Mauritius have jurisdiction over any dispute.",
          ],
        },
      ]}
    />
  );
}
