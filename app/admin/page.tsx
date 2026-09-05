import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { getRaces } from "@/lib/races";
import { getHorses } from "@/lib/horses";
import { getJockeys } from "@/lib/jockeys";
import { getTrainers } from "@/lib/trainers";
import { getStables } from "@/lib/stables";
import { getOwners } from "@/lib/owners";
import { getNews } from "@/lib/news";
import { getStreams } from "@/lib/streams";
import { getProfiles } from "@/lib/users";
import AdminDashboard from "@/components/AdminDashboard";

export const revalidate = 0;

export default async function AdminPage() {
  // Real authorization check, independent of middleware: getUser() verifies
  // the session against Supabase's auth server, then role is re-checked
  // against the profiles table here too — so this page stays protected even
  // if something were ever misconfigured in middleware.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) {
    redirect("/admin/login?error=not_authorized");
  }

  const [races, horses, jockeys, trainers, stables, owners, news, streams, profiles] = await Promise.all([
    getRaces(),
    getHorses(),
    getJockeys(),
    getTrainers(),
    getStables(),
    getOwners(),
    getNews(),
    getStreams(),
    getProfiles(),
  ]);

  return (
    <AdminDashboard
      role={profile.role}
      email={user.email ?? ""}
      races={races}
      horses={horses}
      jockeys={jockeys}
      trainers={trainers}
      stables={stables}
      owners={owners}
      news={news}
      streams={streams}
      profiles={profiles}
    />
  );
}
