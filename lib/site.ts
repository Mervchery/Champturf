// Single place for the details the policy pages quote. Update before launch.
export const SITE = {
  name: "Champ Turf",
  // Set NEXT_PUBLIC_CONTACT_EMAIL in .env.local to your real inbox.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@example.com",
  updated: "5 October 2026",
};

/** Public origin of the site, no trailing slash. Used for canonical URLs, the
 *  sitemap, share cards and links inside notifications.
 *  Set NEXT_PUBLIC_SITE_URL (e.g. https://champturf.mu) in production. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
