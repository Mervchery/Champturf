import { redirect } from "next/navigation";

// Races are now organised by race day rather than shown independently —
// see app/race-days/. This route stays alive so old links/bookmarks to
// /races don't 404, they just land on the new structure instead.
export default function RacesPage() {
  redirect("/race-days");
}
