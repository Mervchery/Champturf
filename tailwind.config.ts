import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  // hover: utilities only apply on devices that can hover, so taps on a phone never leave
  // a "stuck" hover style behind.
  future: { hoverOnlyWhenSupported: true },
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        turf: "var(--turf)",
        turf2: "var(--turf-2)",
        parchment: "var(--parchment)",
        parchment2: "var(--parchment-2)",
        gold: "var(--gold)",
        gold2: "var(--gold-2)",
        coral: "var(--coral)",
        // Coral as *text* — a lighter tint in dark mode, where the fill colour above is too dark to read.
        "coral-ink": "var(--coral-ink)",
        surface: "var(--surface)",
        line: "var(--line)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "16px",
      },
      maxWidth: {
        wrap: "1180px",
      },
    },
  },
  plugins: [],
};
export default config;
