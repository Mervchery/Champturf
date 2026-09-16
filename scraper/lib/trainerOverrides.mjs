// Confirmed by inspecting real race pages: some real, distinct trainers
// are displayed with the exact same text on supertote.mu (e.g. two
// different people both shown as "R. Gujadhur", with no other
// distinguishing detail anywhere on the page). No amount of parsing or
// name-normalization can fix this automatically — the information needed
// to tell them apart simply isn't in what's scraped.
//
// This file is where you encode that missing knowledge by hand, keyed by
// the horse's slug (the last part of its supertote.mu URL, e.g.
// "future-swing" from https://supertote.mu/horse/future-swing).
//
// The value is the exact trainer name to use instead of whatever the
// page shows for that horse — pick any name that distinguishes the real
// person in your own trainers table (they don't need to match the site's
// wording, since the site can't tell them apart anyway).
//
// Add a line here any time you discover a horse whose scraped trainer
// name is ambiguous. This assumes each horse stays with the same
// (disambiguated) trainer for its whole racing career — if a horse
// genuinely changes trainers later, update its horses.trainer_id
// directly in the admin dashboard instead of editing this file.
export const TRAINER_OVERRIDES = {
  "rapidash": "R. Gujadhur",
  "future-swing": "R. Gujadhur",
  "courtly": "Gujadhur",
  "view-of-the-world": "Gujadhur",
};

export function resolveTrainerName(horseSlug, scrapedName) {
  if (horseSlug && TRAINER_OVERRIDES[horseSlug]) return TRAINER_OVERRIDES[horseSlug];
  return scrapedName;
}
