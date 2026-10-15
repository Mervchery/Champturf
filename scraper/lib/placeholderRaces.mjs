// Placeholder races created from an MTCJC nomination sheet before Supertote publishes the meeting
// (e.g. supabase/race_day_19_sunday_18_oct_migration.sql). Listed in running order: index 0 = race 1.
// When the scraper meets "Race N" of that date and finds no race with Supertote's name, it renames the
// matching placeholder instead of creating a second race (see upsertRace). Keeps class / rails.
export const PLACEHOLDER_RACES = {
  "2026-10-18": [
    "Race 1 [0-20]", "Race 2 [0-25]", "Race 3 [BM56]", "Low Division Stakes",
    "Pinnacle Stakes", "MTC 175th Anniversary Cup", "Middle Stakes", "Race 8 [BM36]",
  ],
};
