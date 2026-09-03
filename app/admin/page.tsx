import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import AdminDashboard from "@/components/AdminDashboard";

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

  return <AdminDashboard role={profile.role} email={user.email ?? ""} />;
}
