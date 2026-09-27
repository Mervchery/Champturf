import { NextRequest, NextResponse } from "next/server";

// Some silk hosts (e.g. mtcjockeyclub.com) block image requests that don't
// look like they came from a normal page load in a browser — the request
// works fine pasted into a browser tab, but a plain <img src="..."> from a
// different origin (champturf.vercel.app) gets rejected. This route fetches
// the image server-side with a real browser User-Agent and a same-origin
// Referer, then streams the bytes back so the <img> tag always loads from
// our own domain. Horse silks scraped from supertote.mu load fine either
// way, so everything is routed through here uniformly.
//
// `url` is admin-entered (see components/AdminDashboard.tsx), not user
// input, but this endpoint is public, so we still guard against it being
// used as an open proxy: only http(s) targets, and only actual image
// responses are streamed back.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) return new NextResponse("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new NextResponse("Unsupported protocol", { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": `${parsed.protocol}//${parsed.host}/`,
        "Accept": "image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: upstream.status });
    }
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 415 });
    }

    const bytes = await upstream.arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}
