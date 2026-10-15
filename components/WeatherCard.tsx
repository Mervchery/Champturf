import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Sun, Wind } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import type { DayForecast, WeatherKind } from "@/lib/weather";

const ICONS: Record<WeatherKind, typeof Sun> = {
  clear: Sun, partly: CloudSun, cloud: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, storm: CloudLightning,
};
const LABELS: Record<WeatherKind, string> = {
  clear: "Sunny", partly: "Partly cloudy", cloud: "Cloudy", fog: "Foggy", drizzle: "Light drizzle", rain: "Rain", storm: "Thunderstorms",
};

export function WeatherIcon({ kind, size = 18 }: { kind: WeatherKind; size?: number }) {
  const Icon = ICONS[kind];
  return <Icon size={size} aria-hidden="true" />;
}

/** Forecast for the race day at Champ de Mars: headline, the key numbers and an hour-by-hour strip with the
 *  hours that have a race highlighted. Only rendered when there is a forecast for that date. */
export default function WeatherCard({ forecast, raceHours }: { forecast: DayForecast; raceHours: number[] }) {
  const { t } = getT();
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return (
    <section className="panel weather-card" aria-label={t("Race day forecast")}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl">{t("Race day forecast")}</h2>
          <p className="text-xs opacity-65 mt-0.5">{t("Champ de Mars, Port Louis · racing hours only")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="weather-hero-icon"><WeatherIcon kind={forecast.kind} size={26} /></span>
          <div className="leading-tight">
            <div className="font-semibold">{t(LABELS[forecast.kind])}</div>
            <div className="text-xs opacity-70">{t("High {h}° · Low {l}°", { h: forecast.high, l: forecast.low })}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mt-4">
        <div className="stat-cell !text-left border border-line rounded-xl">
          <div className="stat-label !text-left flex items-center gap-1"><Droplets size={11} aria-hidden="true" /> {t("Chance of rain")}</div>
          <div className="font-semibold tabular-nums mt-0.5">{forecast.rainMax}%</div>
          <div className="text-[0.68rem] opacity-65">{forecast.rainMm > 0 ? t("{n} mm expected", { n: forecast.rainMm }) : t("Dry expected")}</div>
        </div>
        <div className="stat-cell !text-left border border-line rounded-xl">
          <div className="stat-label !text-left flex items-center gap-1"><Wind size={11} aria-hidden="true" /> {t("Wind")}</div>
          <div className="font-semibold tabular-nums mt-0.5">{forecast.windMax} <span className="text-xs font-normal">km/h</span></div>
          <div className="text-[0.68rem] opacity-65">{t("Gusts {n} km/h", { n: forecast.gustMax })}</div>
        </div>
        <div className="stat-cell !text-left border border-line rounded-xl">
          <div className="stat-label !text-left">{t("Temperature")}</div>
          <div className="font-semibold tabular-nums mt-0.5">{forecast.low}–{forecast.high}°C</div>
          <div className="text-[0.68rem] opacity-65">{t("Over the day")}</div>
        </div>
      </div>

      <div className="weather-strip" role="list" aria-label={t("Hour by hour")}>
        {forecast.hours.map((x) => (
          <div key={x.hour} role="listitem" className={`weather-hour ${raceHours.includes(x.hour) ? "has-race" : ""}`}>
            <span className="text-[0.66rem] font-semibold opacity-70 tabular-nums">{hh(x.hour)}</span>
            <WeatherIcon kind={x.kind} size={20} />
            <span className="font-semibold tabular-nums text-sm">{x.temp}°</span>
            <span className="text-[0.62rem] tabular-nums opacity-70 flex items-center gap-0.5"><Droplets size={9} aria-hidden="true" />{x.rain}%</span>
          </div>
        ))}
      </div>
      <p className="text-[0.68rem] opacity-60 mt-2.5">
        {t("Gold = a race starts in this hour.")} {t("Forecast by")} <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">Open-Meteo.com</a>. {t("It can change — check closer to race time.")}
      </p>
    </section>
  );
}
