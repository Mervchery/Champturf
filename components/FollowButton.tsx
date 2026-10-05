"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell, BellRing } from "lucide-react";
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

  const cls = variant === "icon"
    ? `inline-flex items-center justify-center w-9 h-9 rounded-full border border-line transition ${following ? "bg-gold text-ink border-gold" : "bg-surface hover:border-gold"} disabled:opacity-60`
    : `btn ${following ? "btn-gold" : "btn-outline"} disabled:opacity-60`;

  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`} className={cls} aria-label={aria} title={t("Sign in to follow this horse")}>
        <Bell size={variant === "icon" ? 16 : 15} />
        {variant === "full" && <span>{t("Follow")}</span>}
      </Link>
    );
  }

  function onClick() {
    setError(false);
    const next = !following;
    setFollowing(next); // optimistic
    start(async () => {
      const res = await toggleFollow(horseId);
      if (!res.ok) { setFollowing(!next); setError(true); }
      else setFollowing(res.following);
    });
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={onClick} disabled={pending} aria-pressed={following} aria-label={aria} title={aria} className={cls}>
        <Icon size={variant === "icon" ? 16 : 15} />
        {variant === "full" && <span>{label}</span>}
      </button>
      {error && <span className="text-xs text-coral mt-1">{t("Something went wrong — try again.")}</span>}
    </span>
  );
}
