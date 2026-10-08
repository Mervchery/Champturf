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
  // The "R. Gujadhur" trainer
  "rapidash": "R. Gujadhur",
  "future-swing": "R. Gujadhur",

  // The plain "Gujadhur" trainer
  "afrique": "Gujadhur",
  "allez-moris": "Gujadhur",
  "amancio": "Gujadhur",
  "ashikule": "Gujadhur",
  "at-my-command": "Gujadhur",
  "blue-bay": "Gujadhur",
  "boardwalk-breeze": "Gujadhur",
  "boom-town": "Gujadhur",
  "courtly": "Gujadhur",
  "crescent": "Gujadhur",
  "diamond-days": "Gujadhur",
  "future-frequency": "Gujadhur",
  "grand-bay": "Gujadhur",
  "join-the-dots": "Gujadhur",
  "let-it-be-said": "Gujadhur",
  "makazole": "Gujadhur",
  "mercenary": "Gujadhur",
  "midnight-flyer": "Gujadhur",
  "montien": "Gujadhur",
  "monumental": "Gujadhur",
  "moonlight-trader": "Gujadhur",
  "new-world": "Gujadhur",
  "paved-with-gold": "Gujadhur",
  "port-louis": "Gujadhur",
  "river-hawk": "Gujadhur",
  "smarten-up": "Gujadhur",
  "soldier-boy": "Gujadhur",
  "sun-blushed": "Gujadhur",
  "taskmaster": "Gujadhur",
  "the-centurion": "Gujadhur",
  "the-mauritian": "Gujadhur",
  "view-of-the-world": "Gujadhur",
  "wugug": "Gujadhur",
  "zeus": "Gujadhur",
  "zil-moris": "Gujadhur",
  "zoomie": "Gujadhur",
};

export function resolveTrainerName(horseSlug, scrapedName) {
  if (horseSlug && TRAINER_OVERRIDES[horseSlug]) return TRAINER_OVERRIDES[horseSlug];
  return scrapedName;
}
