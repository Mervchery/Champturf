import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Server Components can't set cookies — this throws when called
          // from one, which is fine: middleware refreshes the session on
          // every request, so Server Components only ever need to read it.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // no-op in a Server Component context
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // no-op in a Server Component context
          }
        },
      },
    }
  );
}
