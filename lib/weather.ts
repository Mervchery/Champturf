import { mauritiusDate } from "@/lib/raceState";

// Forecast for ONE race day at Champ de Mars, Port Louis — nothing else. Data: Open-Meteo (free, no key,
// CC BY 4.0 — the card credits it). Cached 30 min on the server, shared by every visitor; any failure just
// means no weather card, never a broken page.
const LAT = -20.169;
const LON = 57.514;
export const FORECAST_DAYS = 15; // Open-Meteo forecasts up to 16 days; stay safely inside it.

export type WeatherKind = "clear" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "storm";

export type HourForecast = { hour: number; temp: number; rain: number; kind: WeatherKind; wind: number; gust: number };
export type DayForecast = {
  date: string;
  hours: HourForecast[]; // 08:00–18:00 local, the racing window
  high: number; low: number;
  rainMax: number;   // highest chance of rain (%) in the racing window
  rainMm: number;    // total rain (mm) in the racing window
  windMax: number;   // km/h
  gustMax: number;   // km/h
  kind: WeatherKind; // overall look of the racing window
};

export function kindOf(code: number): WeatherKind {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 95) return "storm";
  return "cloud";
}

const SEVERITY: Record<WeatherKind, number> = { clear: 0, partly: 1, cloud: 2, fog: 3, drizzle: 4, rain: 5, storm: 6 };

/** Forecast for `date` (YYYY-MM-DD), or null when the day is in the past, too far ahead, or the lookup fails. */
export async function getRaceDayForecast(date: string): Promise<DayForecast | null> {
  const today = mauritiusDate(Date.now());
  const diff = Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
  if (!Number.isFinite(diff) || diff < 0 || diff > FORECAST_DAYS) return null;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m` +
      `&daily=temperature_2m_max,temperature_2m_min&timezone=Indian%2FMauritius&wind_speed_unit=kmh` +
      `&start_date=${date}&end_date=${date}`;
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const j = await res.json();
    const h = j?.hourly;
    if (!h?.time?.length) return null;
    const hours: HourForecast[] = [];
    let rainMm = 0;
    for (let i = 0; i < h.time.length; i++) {
      const hour = Number(String(h.time[i]).slice(11, 13));
      if (hour < 8 || hour > 18) continue;
      rainMm += Number(h.precipitation?.[i] ?? 0);
      hours.push({
        hour,
        temp: Math.round(h.temperature_2m[i]),
        rain: Math.round(h.precipitation_probability?.[i] ?? 0),
        kind: kindOf(Number(h.weather_code[i])),
        wind: Math.round(h.wind_speed_10m[i]),
        gust: Math.round(h.wind_gusts_10m[i]),
      });
    }
    if (hours.length === 0) return null;
    const kind = hours.reduce<WeatherKind>((worst, x) => (SEVERITY[x.kind] > SEVERITY[worst] ? x.kind : worst), "clear");
    return {
      date,
      hours,
      high: Math.round(j.daily?.temperature_2m_max?.[0] ?? Math.max(...hours.map((x) => x.temp))),
      low: Math.round(j.daily?.temperature_2m_min?.[0] ?? Math.min(...hours.map((x) => x.temp))),
      rainMax: Math.max(...hours.map((x) => x.rain)),
      rainMm: Math.round(rainMm * 10) / 10,
      windMax: Math.max(...hours.map((x) => x.wind)),
      gustMax: Math.max(...hours.map((x) => x.gust)),
      kind,
    };
  } catch {
    return null;
  }
}

/** The forecast hour that a race at "HH:MM[:SS]" falls in. */
export function hourFor(day: DayForecast | null, raceTime: string | null | undefined): HourForecast | null {
  if (!day || !raceTime) return null;
  const hr = Number(raceTime.slice(0, 2));
  return day.hours.find((x) => x.hour === hr) ?? null;
}
