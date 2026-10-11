import { createPublicClient as createClient } from "@/lib/supabase/public";
import { isCancelled } from "@/lib/raceState";

export type MeetingInfo = {
  race_date: string;
  course: string;
  weather: string | null;
  track_condition: string | null;
  notes: string | null;
};

export type RaceDaySummary = MeetingInfo & {
  raceCount: number;
  totalPrize: number;
  status: "upcoming" | "completed" | "mixed";
};

/** One row per distinct race_date that has at least one race, richest
 *  meeting info joined in where an admin has set it (weather/track
 *  condition aren't scraped — there's no source for them — so these stay
 *  null until entered manually in the admin dashboard). */
export async function getRaceDays(): Promise<RaceDaySummary[]> {
  const supabase = createClient();
  const [{ data: races, error }, { data: meetings, error: meetingsError }] = await Promise.all([
    supabase.from("races").select("race_date, race_time, course, prize, status").order("race_date", { ascending: false }),
    supabase.from("meetings").select("*"),
  ]);
  if (error) throw error;
  if (meetingsError) throw meetingsError;

  const nowMs = Date.now();
  const meetingByDate = new Map((meetings ?? []).map((m) => [m.race_date, m]));
  const grouped = new Map<string, { course: string; prize: number; statuses: Set<string>; count: number }>();

  for (const r of races ?? []) {
    const existing = grouped.get(r.race_date) ?? { course: r.course, prize: 0, statuses: new Set<string>(), count: 0 };
    existing.prize += r.prize ?? 0;
    // A race that never got a result (cancelled) must not keep the whole meeting "in progress".
    const effective = r.status !== "completed" && isCancelled(r as any, nowMs) ? "completed" : r.status;
    existing.statuses.add(effective);
    existing.count += 1;
    grouped.set(r.race_date, existing);
  }

  return [...grouped.entries()]
    .map(([race_date, g]) => {
      const meeting = meetingByDate.get(race_date);
      const status: RaceDaySummary["status"] =
        g.statuses.size > 1 ? "mixed" : (g.statuses.values().next().value as "upcoming" | "completed");
      return {
        race_date,
        course: meeting?.course ?? g.course,
        weather: meeting?.weather ?? null,
        track_condition: meeting?.track_condition ?? null,
        notes: meeting?.notes ?? null,
        raceCount: g.count,
        totalPrize: g.prize,
        status,
      };
    })
    .sort((a, b) => b.race_date.localeCompare(a.race_date));
}

export type Meeting = {
  id: string;
  race_date: string;
  course: string;
  weather: string | null;
  track_condition: string | null;
  notes: string | null;
};

/** Raw meeting rows (with id) for the admin dashboard's edit table —
 *  getRaceDays() above is for the public-facing aggregated view. */
export async function getMeetingsRaw(): Promise<Meeting[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("meetings").select("*").order("race_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMeetingInfo(raceDate: string): Promise<MeetingInfo | null> {
  const supabase = createClient();
  const { data } = await supabase.from("meetings").select("*").eq("race_date", raceDate).maybeSingle();
  if (!data) return null;
  return data;
}
