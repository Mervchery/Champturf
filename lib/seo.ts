import type { Metadata } from "next";

/** Per-page metadata with a canonical URL and matching Open Graph/Twitter text.
 *  The share image falls back to the site-wide card (app/opengraph-image.tsx). */
export function pageMeta(opts: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  const { title, description, path, noindex } = opts;
  return {
    title,
    description: description.length > 300 ? description.slice(0, 297) + "…" : description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", siteName: "Champ Turf" },
    twitter: { card: "summary_large_image", title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
