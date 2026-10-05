import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Community guidelines — Champ Turf" };

export default function GuidelinesPage() {
  return (
    <PolicyPage
      current="/community-guidelines"
      title="Community guidelines"
      intro="The live chat is for racing fans to enjoy race day together. Please keep it friendly and fun."
      sections={[
        {
          title: "Be respectful",
          body: [
            [
              "No harassment, insults, threats or hate speech of any kind.",
              "No discrimination based on race, religion, gender, nationality, sexuality or disability.",
              "Disagree about a horse, not about a person.",
            ],
          ],
        },
        {
          title: "Keep it safe and legal",
          body: [
            [
              "Do not share personal information about yourself or anyone else.",
              "No spam, repeated messages, advertising or links to other sites.",
              "No promotion of illegal betting, match-fixing or unlicensed gambling operators.",
              "No sexual, violent or otherwise inappropriate content.",
            ],
          ],
        },
        {
          title: "Chat limits",
          body: ["Messages are limited to 150 characters and there is a short pause between messages to keep the chat readable."],
        },
        {
          title: "Enforcement",
          body: ["We may delete messages, restrict chat access, or suspend or close accounts that break these guidelines. Repeat or serious breaches may result in a permanent ban. To report a problem, email us at the address below."],
        },
      ]}
    />
  );
}
