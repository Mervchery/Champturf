import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { safeNext } from "@/lib/auth";
import AuthPanel from "@/components/AuthPanel";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

// One sign-in page for everyone. What a person can do afterwards depends only
// on their role: staff reach /admin, members get the public site and /account.
export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const { t } = getT();
  const next = searchParams.next ? safeNext(searchParams.next) : null;
  const error = searchParams.error;

  const { data: { user } } = await createClient().auth.getUser();
  // Already signed in → go on. (Not when sent here because the account lacks staff access, or we'd loop.)
  if (user && error !== "not_authorized") redirect(next ?? "/account");

  const notice =
    error === "not_authorized"
      ? t("This account is signed in but doesn't have staff access to the dashboard.")
      : error === "oauth"
        ? t("Sign-in didn't complete. Please try again.")
        : null;

  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center px-5 py-10 gap-4">
      <AuthPanel next={next} notice={notice} />
      {user && error === "not_authorized" && (
        <div className="text-sm opacity-80 text-center">
          {t("Signed in as {email}.", { email: user.email ?? "" })} <SignOutButton variant="link" />
        </div>
      )}
    </section>
  );
}
