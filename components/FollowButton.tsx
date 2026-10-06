"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { toggleFollow } from "@/lib/actions/follows";

/** Follow / unfollow a horse for race-day alerts.
 *  variant "icon" is the compact bell used on race cards; "full" is the labelled
 *  button used on the horse profile. Signed-out visitors are sent to /login and
 *  come straight back to the page they were on. */
export default function FollowButton({
  horseId, horseName, initialFollowing, signedIn, variant = "full",
}: {
  horseId: string; horseName: string; initialFollowing: boolean; signedIn: boolean; variant?: "icon" | "full";
}) {
  const { t } = useT();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const label = following ? t("Following") : t("Follow");
  const aria = following
    ? t("Stop alerts for {name}", { name: horseName })
    : t("Get alerts for {name}", { name: horseName });
  const Icon = following ? BellRing : Bell;

  const [rang, setRang] = useState(false); // plays the bell-ring flourish right after following
  const cls = `follow-btn ${variant === "icon" ? "follow-icon" : "follow-full"}`;
  const iconSize = variant === "icon" ? 18 : 17;

  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`} className={cls} aria-label={aria} title={t("Sign in to follow this horse")}>
        <Bell size={iconSize} className="follow-ico" aria-hidden="true" />
        {variant === "full" && <span>{t("Follow")}</span>}
      </Link>
    );
  }

  function onClick() {
    setError(false);
    const next = !following;
    setFollowing(next); // optimistic
    setRang(next);
    start(async () => {
      const res = await toggleFollow(horseId);
      if (!res.ok) { setFollowing(!next); setError(true); }
      else setFollowing(res.following);
    });
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={onClick} disabled={pending} aria-pressed={following} aria-label={aria} title={aria} className={cls}>
        <Icon size={iconSize} className={`follow-ico ${rang && following ? "follow-ring" : ""}`} aria-hidden="true" />
        {variant === "full" && <span>{label}</span>}
        {variant === "full" && following && <Check size={15} aria-hidden="true" />}
      </button>
      {/* Spoken confirmation for screen-reader users (the button's own label also flips). */}
      <span className="sr-only" role="status" aria-live="polite">{rang ? (following ? t("Alerts on for {name}", { name: horseName }) : t("Alerts off for {name}", { name: horseName })) : ""}</span>
      {error && <span className="text-xs text-coral-ink mt-1">{t("Something went wrong — try again.")}</span>}
    </span>
  );
}
