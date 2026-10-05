import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Default share card (WhatsApp / Facebook / X / iMessage previews) for every page.
export const runtime = "nodejs";
export const alt = "Champ Turf — Mauritius Horse Racing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          background: "linear-gradient(135deg, #0a1f18 0%, #123c2e 60%, #1b5240 100%)",
          color: "#f3ecda", padding: "0 90px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={260} height={260} alt="" style={{ borderRadius: 130 }} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 70 }}>
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#e4c878", fontWeight: 700 }}>CHAMP DE MARS · MAURITIUS</div>
          <div style={{ fontSize: 96, fontWeight: 700, marginTop: 14, lineHeight: 1.05 }}>Champ Turf</div>
          <div style={{ fontSize: 34, marginTop: 22, opacity: 0.85, maxWidth: 640, lineHeight: 1.3 }}>
            Race cards, live odds movement and results for every meeting.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
