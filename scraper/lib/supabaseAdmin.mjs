import { createClient } from "@supabase/supabase-js";

// This uses SUPABASE_SERVICE_ROLE_KEY (not the NEXT_PUBLIC_ anon key the
// app uses) because the scraper is a trusted, manually-run admin process
// that needs to bypass RLS to write races/horses/etc. directly — it
// doesn't go through a logged-in admin session like the dashboard does.
//
// NEVER import this file from anything in app/ or components/ — the
// service role key must never reach the browser. This is only safe to
// use from a standalone script run locally or in a private CI job.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment.");
  console.error("Get the service role key from Supabase: Settings -> API -> service_role secret.");
  process.exit(1);
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
