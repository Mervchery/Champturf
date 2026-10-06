import type { MetadataRoute } from "next";

// Lets people "Add to Home Screen" and open Champ Turf like an app.
// (Also required on iPhone before web-push notifications can be enabled.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Champ Turf — Mauritius Horse Racing",
    short_name: "Champ Turf",
    description: "Race cards, live odds movement, results and horse records for every meeting at Champ de Mars.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#123c2e",
    theme_color: "#123c2e",
    categories: ["sports", "news"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
