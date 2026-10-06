import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { isAdminRole } from "@/lib/roles";
import { dateLocale } from "@/lib/i18n";
import SignOutButton from "@/components/SignOutButton";
import PushToggle from "@/components/PushToggle";
import InstallApp from "@/components/InstallApp";
import FollowedHorsesList from "@/components/FollowedHorsesList";
import NotificationsPanel from "@/components/NotificationsPanel";
import { getFollowedHorses, getNotifications } from "@/lib/follows";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { t, lang } = getT();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase.from("profiles").select("role, full_name, avatar_url, created_at").eq("id", user.id).single();
  const isStaff = isAdminRole(profile?.role);
  const name = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || null;
  const provider = (user.app_metadata?.provider as string | undefined) ?? "email";
  const initial = (name || user.email || "?").trim().charAt(0).toUpperCase();
  const [followed, notifications] = await Promise.all([getFollowedHorses(user.id), getNotifications(user.id, 20)]);
  const since = new Date(profile?.created_at ?? user.created_at).toLocaleDateString(dateLocale(lang), { year: "numeric", month: "long", day: "numeric" });

  return (
    <section className="py-12">
      <div className="wrap max-w-xl">
        <span className="text-xs font-semibold text-coral-ink">{t("YOUR ACCOUNT")}</span>
        <h1 className="font-display text-3xl mt-1 mb-6">{t("My account")}</h1>

        <div className="card no-hover p-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" width={56} height={56} className="rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="w-14 h-14 rounded-full bg-turf text-white flex items-center justify-center font-display text-xl">{initial}</span>
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate">{name ?? user.email}</div>
              {name && <div className="text-sm opacity-70 truncate">{user.email}</div>}
              <span className={`pill mt-1.5 inline-block ${isStaff ? "pill-gold" : "pill-outline"}`}>{isStaff ? profile?.role : t("Member")}</span>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs opacity-70">{t("Signed in with")}</dt>
              <dd className="font-medium capitalize">{provider === "email" ? t("Email") : provider}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-70">{t("Member since")}</dt>
              <dd className="font-medium">{since}</dd>
            </div>
          </dl>

          <div className="flex gap-3 flex-wrap mt-7">
            {isStaff && (
              <Link href="/admin" className="btn btn-dark"><LayoutDashboard size={15} /> {t("Admin dashboard")}</Link>
            )}
            <SignOutButton />
          </div>
        </div>

        <div className="card no-hover p-6 mt-6">
          <h2 className="font-display text-xl">{t("Get the app")}</h2>
          <p className="text-sm opacity-70 mt-1 mb-4">{t("Add Champ Turf to your Home Screen to open it full screen in one tap.")}</p>
          <InstallApp className="btn btn-dark" />
        </div>

        <div className="card no-hover p-6 mt-6">
          <h2 className="font-display text-xl">{t("Race-day alerts")}</h2>
          <p className="text-sm opacity-70 mt-1 mb-4">{t("Follow a horse to hear when it is declared to run, when its odds move and how it finished.")}</p>
          <PushToggle />
        </div>

        <div className="card no-hover p-6 mt-6">
          <h2 className="font-display text-xl mb-2">{t("Horses you follow")}</h2>
          <FollowedHorsesList initial={followed as any} />
        </div>

        <div className="card no-hover p-6 mt-6">
          <h2 className="font-display text-xl mb-2">{t("Recent alerts")}</h2>
          <NotificationsPanel items={notifications} />
        </div>
      </div>
    </section>
  );
}
