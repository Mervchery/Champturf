// Light / dark / auto (follow the device). The choice lives in localStorage ("ct-theme");
// nothing is sent to the server. A tiny inline script (THEME_BOOT) applies it before first
// paint so dark-mode visitors never see a white flash.
export type Theme = "light" | "dark" | "system";
export const THEME_KEY = "ct-theme";

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function isDarkFor(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", isDarkFor(theme));
}

/** Runs in <head> before anything paints. Kept dependency-free on purpose. */
export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})();`;
