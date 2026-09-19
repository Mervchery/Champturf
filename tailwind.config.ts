import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        surface: "var(--surface)",
        line: "var(--line)",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
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
