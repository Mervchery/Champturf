import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { safeNext } from "@/lib/auth";

// Where Supabase sends people back to after Google/OAuth sign-in, email
// confirmation, magic links and password-reset emails. It exchanges the `code`
// for a session, then redirects:
//   • to ?next=… when given (only same-site paths are honoured),
//   • otherwise staff go to /admin and everyone else to the home page.
// Add `<your-domain>/auth/callback` to Supabase → Authentication → URL Configuration.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");

  // The provider reported a problem (e.g. the user cancelled the Google prompt).
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  let dest = rawNext ? safeNext(rawNext) : null;
  if (!dest) {
    const { data: { user } } = await supabase.auth.getUser();
    let role: string | null = null;
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      role = profile?.role ?? null;
    }
    dest = isAdminRole(role) ? "/admin" : "/";
  }
  return NextResponse.redirect(`${origin}${dest}`);
}
