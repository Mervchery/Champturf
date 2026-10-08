import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { addDaysIso, getRacePhase, mauritiusDate, raceStartMs } from "@/lib/raceState";

// Tiny "is anything on?" endpoint for the nav's LIVE dot and the mobile tab bar's Race Day
// link. Reads through the shared 30 s data cache; the s-maxage header lets the CDN share one
// answer between visitors too. Never throws — on any failure it answers "nothing live".
export async function GET(request: Request) {
  // Touching the request opts this handler out of build-time caching.
  void request.headers.get("accept");
  const now = Date.now();
  const empty = { now, live: false, date: null as string | null, next: null as { id: string; date: string; time: string } | null };
  try {
    const supabase = createPublicClient();
    const from = addDaysIso(mauritiusDate(now), -1);
    const { data, error } = await supabase
      .from("races")
      .select("id, race_date, race_time, status")
      .eq("status", "upcoming")
      .gte("race_date", from)
      .order("race_date", { ascending: true })
      .order("race_time", { ascending: true })
      .limit(80);
    if (error) throw error;

    const rows = (data ?? []).filter((r) => getRacePhase(r as any, now) !== "unresulted");
    const live = rows.some((r) => getRacePhase(r as any, now) === "live");
    const next = rows
      .filter((r) => raceStartMs(r as any) > now)
      .map((r) => ({ id: r.id as string, date: r.race_date as string, time: r.race_time as string }))[0] ?? null;

    return NextResponse.json(
      { now, live, date: rows[0]?.race_date ?? null, next },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } }
    );
  } catch {
    return NextResponse.json(empty, { headers: { "Cache-Control": "no-store" } });
  }
}
