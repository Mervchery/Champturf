import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy — Champ Turf" };

export default function PrivacyPage() {
  return (
    <PolicyPage
      current="/privacy"
      title="Privacy Policy"
      intro="This policy explains what personal data Champ Turf collects, why we collect it, and the choices you have. Champ Turf is an independent site; we aim to collect as little as we need to run it."
      sections={[
        {
          title: "What we collect",
          body: [
            "Browsing the site does not require an account, and we do not ask for personal details to read race data. If you create an account we collect:",
            [
              "Your email address and password (passwords are stored hashed by our authentication provider; we never see them).",
              "Your name and profile picture, if you give them to us or sign in with Google.",
              "Account details such as when you joined and your member role.",
            ],
            "When you use the live chat, the messages you send are shown to other signed-in members together with your display name. Chat is delivered in real time and is not kept in our database.",
          ],
        },
        {
          title: "How we use your data",
          body: [
            [
              "To create and secure your account and let you sign in.",
              "To unlock member features such as the live chat.",
              "To keep the community safe, enforce our Community guidelines and prevent abuse.",
              "To send account emails you ask for, such as email confirmation and password resets.",
            ],
            "We do not sell your personal data and we do not use it for advertising.",
          ],
        },
        {
          title: "Service providers",
          body: [
            "We use Supabase to host our database, authentication and real-time features, and Google if you choose to sign in with Google. Live streams and replays are embedded from third-party video platforms such as YouTube, which may set their own cookies when you play a video and are governed by their own privacy policies.",
          ],
        },
        {
          title: "Cookies and local storage",
          body: ["We use a small number of cookies and local-storage entries. See our Cookie Policy for details."],
        },
        {
          title: "How long we keep data",
          body: ["We keep your account data for as long as your account is open. If you ask us to delete your account, we delete your profile and sign-in details, except where we must keep something to meet a legal obligation."],
        },
        {
          title: "Your rights",
          body: [
            "Depending on where you live, including under the Mauritius Data Protection Act 2017 and, for people in the EU or UK, the GDPR, you may have the right to:",
            [
              "Access the personal data we hold about you.",
              "Correct data that is wrong or out of date.",
              "Ask us to delete your data or restrict how we use it.",
              "Object to certain uses of your data, or ask for a copy of it.",
              "Complain to your local data protection authority.",
            ],
            "To use any of these rights, email us at the address below.",
          ],
        },
        {
          title: "Security",
          body: ["We use industry-standard measures such as encrypted connections and access controls. No online service is perfectly secure, so please choose a strong, unique password."],
        },
        {
          title: "Children",
          body: ["Champ Turf is intended for adults. You must be 18 or over to create an account. If you believe a child has created an account, contact us and we will remove it."],
        },
        {
          title: "Changes to this policy",
          body: ["We may update this policy from time to time. The date at the top shows when it last changed. If the changes are significant we will tell you on the site."],
        },
      ]}
    />
  );
}
