import { createClient } from "@supabase/supabase-js";

/** How long public data (races, horses, odds, results, news, ticker…) is kept in
 *  Next.js's server-side data cache before the next visitor triggers a refresh.
 *  30s means a scrape that lands at 12:00:00 is on screen by 12:00:30 at the
 *  latest, while hundreds of visitors in that window share ONE database query. */
export const PUBLIC_REVALIDATE_SECONDS = 30;

/** Tag on every cached public read. Admin edits call revalidateTag(PUBLIC_DATA_TAG)
 *  (see lib/actions) so staff changes show up instantly instead of after 30s. */
export const PUBLIC_DATA_TAG = "public-data";

/**
 * Supabase client for PUBLIC reads only (every table it reads has a "public read"
 * RLS policy). Unlike lib/supabase/server.ts it does not touch cookies or the
 * visitor's session, which is what lets Next.js cache the responses and share them
 * between visitors. Never use it for anything user-specific or any write.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, {
            ...init,
            next: { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [PUBLIC_DATA_TAG] },
          } as RequestInit),
      },
    }
  );
}
