// Deliberately has zero imports of its own — anything that pulls in
// next/headers (like lib/supabase/server, which lib/races.ts imports)
// can't be imported from a "use client" component. This constant needs
// to be shared by both server code (lib/races.ts) and client code
// (components/RacesAdminPanel.tsx), so it lives here on its own instead.
export const HORSE_JOIN = "horses(id, name, age, sex, rating, silk_image_url, wins, seconds, thirds, starts, earnings, owner:owners(id, name), trainer:trainers(id, name), stable:stables(id, name, silk_primary, silk_secondary, silk_cap, silk_pattern))";
