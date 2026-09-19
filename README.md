# Champ Turf — Mauritius Horse Racing Platform

A deployable Next.js (App Router + TypeScript + Tailwind CSS) starter for a
Mauritius horse racing site: race calendar, horse/jockey/trainer/stable/owner
databases, news, statistics, results, live-stream page, global search, and a
role-gated admin dashboard backed by **Supabase Auth**.

Icons are from [lucide-react](https://lucide.dev) plus a few bespoke SVGs in
`components/RacingIcons.tsx` — no emoji anywhere in the UI.

## What's real vs. mocked

Every entity in the app is now backed by real Supabase tables with real
admin CRUD — races, horses, jockeys (including apprentices), trainers,
stables, owners, news, and admin users/roles. Nothing left is mock data.

| Layer | Current state | Notes |
|---|---|---|
| Races, entries, results | **Real** — Supabase tables, admin CRUD, public pages read live data | `supabase/races_schema.sql`, `lib/races.ts`, `lib/actions/races.ts`, `components/RacesAdminPanel.tsx` |
| Horses, jockeys, trainers, stables, owners, news | **Real** — Supabase tables, admin CRUD via one generic panel, public pages read live data | `supabase/entities_schema.sql`, `lib/{horses,jockeys,trainers,stables,owners,news}.ts`, `lib/actions/db.ts`, `components/EntityAdminPanel.tsx` |
| Admin auth | **Real** — Supabase Auth, server-verified on every request | See "Admin auth" below |
| Admin users & roles | **Real** — view every Supabase user, change their admin role from the dashboard | `lib/users.ts`, `lib/actions/users.ts`, `components/UsersAdminPanel.tsx` |
| Live stream / chat | Still a static mock UI | Wire to real embed URLs + a realtime service (Supabase Realtime, Pusher, Ably) — see the "Live streams" admin panel's note |
| Media library | Still a placeholder | Wire to Supabase Storage |
| PDF export | Button stub | Wire to a real report-generation endpoint |

## Races & results (Supabase)

Races, entries, and results live in Supabase, and every admin action
actually writes to the database:

- **Schema:** `supabase/races_schema.sql` — `races`, `race_entries`,
  `race_results` tables, with row-level security (public read, admin-only
  write) and optional seed data matching the original mock races.
- **Reads:** `lib/races.ts` — server-side query helpers
  (`getRaces`, `getRaceById`, `getEntriesForRace`, `getResultsForRace`,
  `getCompletedRacesWithResults`), used by the home page, `/races`,
  `/races/[id]`, `/results`, and `/live`'s replay list.
- **Writes:** `lib/actions/races.ts` — Server Actions
  (`createRace`, `updateRace`, `deleteRace`, `createEntry`, `deleteEntry`,
  `upsertResult`, `deleteResult`), called directly from
  `components/RacesAdminPanel.tsx` in the admin dashboard. Each action
  re-checks the caller's admin role server-side before writing — Supabase
  RLS enforces the same rule at the database level, so it's checked twice.

In `/admin` → **Races**: create a race, toggle its status between
Upcoming/Completed, click **Manage** to add starting entries (for upcoming
races) or enter results (for completed races), and delete races entirely.

### Entries are locked to registered horses (`race_entries_results_migration.sql`)

Run `supabase/race_entries_results_migration.sql` after the four schema
files above. It changes how entries and results work:

- **`race_entries.horse_id` and `race_results.horse_id` are real foreign
  keys to `horses`, not free text.** The admin UI only offers a dropdown of
  horses that already exist — there's no way to type an arbitrary name and
  create an entry for a horse that isn't registered. (The migration also
  adds `jockey_id` and `weight_kg` to entries, and drops the old
  `horse_name`/`trainer` text columns — `trainer` is now always read live
  from the horse's own record, so it can't drift out of sync.)
- **The public race card** (`/races/[id]`) now shows each runner's stable,
  trainer, jockey, owner, age/sex, and weight carried — all pulled from the
  linked horse (and jockey) record via that foreign key, not duplicated
  data.
- **Horse stats are no longer editable fields.** `wins`, `seconds`,
  `thirds`, `unplaced`, `starts`, and `earnings` are computed automatically
  by a Postgres trigger every time a result is inserted, edited, or
  deleted — recalculated from scratch from that horse's `race_results` rows,
  so it's correct regardless of the order things were entered in. The
  Horses admin form no longer has inputs for these fields at all, since
  editing them directly would just get overwritten on the next result
  change. **Enter every finisher, not just the podium** — a horse's
  `starts`/`unplaced` count depends on a result row existing for it, so a
  race with only 1st–3rd entered will undercount everyone else's starts.
- **Earnings use an assumed prize split** (60% / 20% / 10% for 1st/2nd/3rd,
  0% beyond that) since only the total purse is stored, not an official
  per-place breakdown. Adjust the percentages in
  `public.recompute_horse_stats()` (in the migration file) if your
  meetings use a different split — no app code needs to change, since
  everything downstream just reads whatever `earnings` ends up as.

Upcoming/Completed, click **Manage** to add starting entries (for upcoming
races) or enter results (for completed races), and delete races entirely.

## Everything else (horses, jockeys, trainers, stables, owners, news)

These six follow one shared pattern rather than six bespoke ones:

- **Schema:** `supabase/entities_schema.sql` — one table per entity, same
  RLS shape as races (public read, admin write via `public.is_admin()`),
  plus seed data matching the originals. A horse's "recent form" isn't a
  stored field — it's computed in `lib/horses.ts` by matching the horse's
  name against `race_results`, so it updates automatically as results are
  entered.
- **Reads:** `lib/horses.ts`, `lib/jockeys.ts`, `lib/trainers.ts`,
  `lib/stables.ts`, `lib/owners.ts`, `lib/news.ts` — one `getX()` (and
  `getXById()` where there's a detail page) per entity.
- **Writes:** `lib/actions/db.ts` — three generic, whitelisted Server
  Actions (`createRow`, `updateRow`, `deleteRow`) shared by all six tables,
  rather than duplicating the same insert/update/delete logic six times.
  The table name is checked against an allow-list before anything runs, and
  the caller's admin role is re-checked on every call.
- **Admin UI:** `components/EntityAdminPanel.tsx` — one config-driven
  table + form component, reused for all six sections in
  `AdminDashboard.tsx` (each just passes a different field list). Jockeys
  and Apprentices are actually the same underlying panel and table, split
  into two sidebar sections by filtering on the `apprentice` field.

Apply `supabase/schema.sql` → `supabase/races_schema.sql` →
`supabase/entities_schema.sql` in that order (each later file depends on
something from the one before it) and every admin section — Horses,
Jockeys, Apprentices, Trainers, Stables, Owners, News — is live.

### Real relationships, not typed names (`relational_links_migration.sql`)

Run this after the three files above (and after
`race_entries_results_migration.sql`). It replaces every place a record
referred to another one by typed-in name with a real foreign key:

- `horses.owner` / `horses.trainer` / `horses.stable` → `owner_id` /
  `trainer_id` / `stable_id`, each a dropdown in the admin form pointing at
  an existing owner/trainer/stable.
- `trainers.stable` → `stable_id`, same idea.
- `jockeys.mentor` (apprentices only) → `mentor_id`, a dropdown of existing
  professional jockeys instead of a typed name.
- `race_entries` gains `runner_no` — the racecard number, shown before Gate
  on the public race card.

The practical effect: rename a stable once, and every horse and trainer
that references it shows the new name immediately — nothing to update by
hand across records. Every page that displays these connections
(`/horses/[id]`, `/trainers`, `/stats`, the race card, admin lists) reads
the live joined name, never a stored copy of it.

Fields with no value now show **N/A** (missing numbers/measurements — age,
weight, gate, ranking) or **Unknown** (a connection that hasn't been set —
owner, trainer, stable, jockey, mentor) instead of a blank or a "—". A
horse's own stats (wins, starts, earnings) still show as real `0` when
that's genuinely accurate, since 0 wins is meaningful data, not missing data.

## Admin users & roles

`/admin` → **Users & roles** lists every Supabase Auth user (via the
`profiles` table) and lets an admin change their role from a dropdown —
including revoking it. Two extra RLS policies (at the bottom of
`entities_schema.sql`) let admins read and update *other* users' profile
rows, on top of the "read your own" policy from `schema.sql`. One built-in
guardrail: you can't remove your own admin role from the UI, so a Super
Admin can't accidentally lock themselves out.

Note this panel only shows/edits users who already have a Supabase account
— it doesn't send invitations or create accounts. New team members still
need an account created first (Authentication → Users in the Supabase
dashboard, or your own sign-up flow if you build one), then they'll appear
here to be granted a role.

## Admin auth (Supabase)

`/admin` is gated by real, server-verified authentication — not a decorative
login screen:

- **Supabase owns the session.** Sign-in calls `supabase.auth.signInWithPassword`
  directly from the browser (`app/admin/login/page.tsx`); Supabase issues and
  manages the session cookie via `@supabase/ssr`.
- **Every request is re-verified.** `middleware.ts` calls
  `supabase.auth.getUser()`, which round-trips to Supabase's auth server to
  validate the token — it can't be spoofed by handing the browser a cookie,
  because there's no local secret to forge it with.
- **Role is checked separately from identity.** Being a valid, signed-in
  Supabase user isn't enough — middleware and `app/admin/page.tsx` both look
  up the user's row in the `profiles` table and require a non-null `role`.
  New signups get no role by default, so they're authenticated but not
  authorized until someone explicitly grants one.
- **Checked in two places on purpose.** Middleware redirects fast for UX;
  `app/admin/page.tsx` re-checks server-side as the real boundary, so the
  page stays protected even if middleware were ever misconfigured.

### Setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. In **Settings → API**, copy the Project URL and `anon` public key into
   your `.env.local` (copy `.env.example` to start):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. In the **SQL Editor**, run these three files **in order** (each depends
   on something from the one before it):
   1. `supabase/schema.sql` — creates `profiles` (one row per user, holding
      their admin `role`), with RLS and a trigger so every signup gets a
      profile row automatically (no role by default).
   2. `supabase/races_schema.sql` — creates `races`, `race_entries`,
      `race_results`, plus the `public.is_admin()` function every other
      table's write policies rely on.
   3. `supabase/entities_schema.sql` — creates `horses`, `jockeys`,
      `trainers`, `stables`, `owners`, `news`, plus the extra `profiles`
      policies that let admins manage other users' roles.
   All three include optional seed data so the site isn't empty on first load.
4. Create your first admin user: **Authentication → Users → Add user** (set
   an email + password), then in the SQL Editor:
   ```sql
   update public.profiles set role = 'Super Admin' where email = 'you@example.com';
   ```
5. If you want email confirmation / magic links / password reset to work,
   set your Supabase project's redirect URL (**Authentication → URL
   Configuration**) to `<your-domain>/auth/callback` — that route is already
   built (`app/auth/callback/route.ts`).

Valid roles: `Super Admin`, `Administrator`, `Race Manager`, `Editor`,
`Statistician`, `Stream Operator` (see `lib/roles.ts`) — any other value, or
no role at all, is treated as not authorized for `/admin`.

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Admin lives at `/admin` (redirects to
`/admin/login`, which requires a real Supabase account with a role set —
see "Admin auth" above).

## Deploying

This is a stock Next.js 14 app, so it deploys as-is to:

- **Vercel** (recommended — zero config): `vercel deploy`, or connect the repo
  in the Vercel dashboard. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars in
  the project settings.
- **Any Node host** (Render, Railway, Fly.io, a VPS): `npm run build && npm start`.

## Scraping real data (scraper/)

`scraper/scrape.mjs` pulls real Mauritius race data from
[supertote.mu](https://supertote.mu) (the Mauritius Turf Club's official
tote/betting platform) into your Supabase database, following the exact
schema this app already uses.

### Read this before running it

**supertote.mu is a licensed betting operator's site, not a neutral open
data source.** Before running this against it:

- Check their `robots.txt` and Terms of Service yourself for any
  restrictions on automated access. This is a legal/permission judgment
  call for you to make, not something built into the tool.
- The scraper is deliberately slow (1.5s between requests, one at a time)
  and identifies itself with a custom `User-Agent` in
  `scraper/lib/fetchHtml.mjs` — update the contact info in that header to
  your own before running it.
- Only scrape what you need. Don't run it in a loop against every date in
  history "just because."

### What it can and can't get

This site does not publish everything the app's schema has a field for:

| Field | Available from this source? |
|---|---|
| Race name, distance, time, date | Yes |
| Full field, gate numbers, weights carried | Yes |
| Finishing positions | Yes, once a race has run |
| Winning time | Yes (other finishers don't get an official time on this site) |
| Horse's trainer, owner(s), age, country of origin | Trainer and age come straight from the race page; owner and country of origin come from the horse's profile page |
| Jockey per race | Yes, read directly from the race page |
| Horse's sex, color, breed | **Not available anywhere on this site** — left blank |
| Horse's stable | **Not available anywhere on this site** — the site tracks trainer and owner only, no separate "stable" concept. `horses.stable_id` stays unset for scraped horses (shows as "Unknown" in the app, same as any horse with no stable assigned) |
| Race prize money / purse | **Not available anywhere on this site** — left as 0 |
| Margin / distance behind | **Not available anywhere on this site** — the `race_results.margin` column exists (for a future source that does publish it) but is always null from this scraper |
| Multiple owners | The site lists co-ownership as one syndicate string (e.g. "Messrs X, Y & Z") — this is stored as a single owner record with that full name, since the schema doesn't model multiple owners per horse |
| Scratched / did-not-finish runners | Detected (placing shown as "-" on the page) — the horse's own record is still created/updated, but no result row is written for that race, since there's no finishing position to store |

### Selectors: verified for race pages, best-effort for horse profiles

`scraper/lib/parseRacePage.mjs` uses real CSS selectors (`.r-placing`,
`.r-name a`, `.r-jockey`, `.r-trainer`, etc.) verified against 8 real race
result pages, including edge cases like scratched runners and
apprentice-claim weight adjustments (`52+1kg`, `57.5-4kg`) — this file is
solid.

`scraper/lib/parseHorseProfile.mjs` (used only for owner and country of
origin — everything else comes from the race page above) is still
pattern-matching on rendered text rather than verified selectors, since no
real horse-profile HTML has been checked yet. If owner/origin come out
wrong, the fix is the same one used to get the race page working: run the
scraper, let it save `scraper/debug/*.html` on failure (or add a similar
dump for horse profile pages if it silently returns wrong data instead of
failing outright), and share that file.

### Setup

Run these SQL files, in order (skip any you've already run):

1. `supabase/scraper_prep_migration.sql`
2. `supabase/scraper_normalization_migration.sql` — **read this file's own
   header comment before running it.** It merges any existing
   jockeys/trainers/owners/stables that are the same person/entity but
   stored with different spacing, punctuation, or capitalization (e.g.
   "D. Schwarz" vs "D Schwarz"), adds real `jockey_id`/`trainer_id`
   foreign keys to `race_results` (previously jockey was plain text
   there), adds `trainer_id` to `race_entries`, and adds indexes needed
   for a large historical import to stay fast. It prints what it merged
   via `RAISE NOTICE` — check the SQL editor's output after running.

Then:

3. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (see `.env.example`) —
   the scraper needs this to bypass RLS, since it's a trusted offline
   process, not a logged-in admin session.
4. `npm install` (adds `cheerio`, used to parse the fetched HTML).

### Running it

```bash
# One day:
npm run scrape -- 06-sep-2026

# A date range (every day from start to end, inclusive):
npm run scrape -- 01-jan-2020 06-sep-2026
```

The date format must match the site's own URLs (check `/racing/calendar`
on the site for the correct spelling for a given date).

For a range, the scraper walks every calendar day between the two dates
and checks each one — most days have no meeting, and those are logged as
"skipped" (not an error) and it moves straight on. **A multi-year range is
genuinely slow** — the deliberate rate limit (1.5s between requests, see
`scraper/lib/fetchHtml.mjs`) means even just checking every day from 2020
to now is well over an hour before any actual race data is fetched, and
race days add several more requests each (one per race, plus one per
newly-seen horse). Expect a full multi-year backfill to run for hours, not
minutes. Consider running it in smaller chunks (e.g. one year at a time)
so a crash or interruption partway through doesn't lose all your progress
— everything already written to Supabase before an interruption stays
there, since each race is committed as it's processed, not at the end.

This upserts by name (normalized, per the migration above) — running it
again for the same date won't create duplicates, and re-running it after
a race has finished will update that race from "upcoming" (with entries)
to "completed" (with results). Only fields that actually changed get
written, so re-scraping unchanged data doesn't inflate the stats or churn
the tables.

### What you'll see at the end

Every run prints a summary: dates processed/skipped, races processed,
horses/jockeys/trainers/owners added vs. updated, entries and results
imported, and a list of any errors encountered — one bad race or one
unreachable day never stops the rest of the run.

### On historical accuracy

Going forward, `jockey_id` and `trainer_id` on both entries and results
are always exactly what the race page stated at that specific race — not
a horse's current trainer. The one exception is the **one-time backfill**
in `scraper_normalization_migration.sql` for rows that existed *before*
this migration: since the old data didn't record trainer at race time,
those rows are backfilled from the horse's current trainer as an
approximation. If a horse has since changed trainers, older backfilled
rows will show the wrong (current) one — this only affects data scraped
before this update; anything scraped from now on is accurate at the time
it happened.

## Interface redesign (September 2026)

A significant visual and structural pass, delivered in a scoped first phase.

### What's new

- **Design system**: refined shadows/radii/motion in `app/globals.css` — same
  class names as before (`.card`, `.panel`, `.pill`, `.btn`) so no other
  file needed to change, plus new `.stat-tile`, `.glass`, `.runner-row`,
  and podium (`.podium-1/2/3`) classes for the new layouts.
- **Stable silks**: `components/Silk.tsx` renders a scalable SVG silk
  (jacket + cap, 7 pattern options) from a stable's own colors — appears
  on the stable/trainer/horse profile pages and every race card row.
  Configure a stable's silk in the admin Stables form.
- **Race Days**: races are now organized by meeting. `/race-days` lists
  every date with races; `/race-days/[date]` shows that meeting's weather/
  track condition (admin-entered — see the new "Race Days" admin section)
  and all its races. `/races` now redirects here; individual race pages
  (`/races/[id]`) are unchanged as URLs and link back to their race day.
- **Redesigned race cards**: `components/RunnerCard.tsx` replaces the old
  plain tables for both entries and results — silk, runner number, rating,
  odds, form for upcoming races; podium highlighting, margin, finish time,
  starting price, performance rating, and computed prize money for results.
- **New profile pages**: Trainers and Stables now have real detail pages
  (`/trainers/[id]`, `/stables/[id]`) with computed career stats (win %,
  place %, average finishing position), associated horses, and recent
  results — these didn't exist before. Jockey and Horse pages gained the
  same statistics plus photo/silk support.
- **New fields**: `horses.rating`, `horses/trainers/jockeys.photo_url`,
  `race_entries.odds`, `race_results.margin/starting_price/performance_rating`,
  and the new `meetings` table (weather/track condition per race day) —
  all added in `supabase/design_upgrade_migration.sql`. Run this after
  every previous migration.

### Explicitly deferred, not silently skipped

- **Performance charts** (rating history, earnings-over-time graphs) —
  the stat tiles and tables carry the same information today; charts are
  a real follow-up, not built in this pass.
- **Actual photo uploads** — `photo_url` fields take a URL you paste in
  admin (e.g. an image already hosted somewhere), there's no file upload
  yet. Same status as the media library section already had.
- **Live weather data** — `meetings.weather`/`track_condition` are plain
  admin-entered text, not pulled from a weather API.
- **Silks in search results and the statistics pages** — wired in
  everywhere else (stable/trainer/horse profiles, race cards), but not
  yet in `/search` or `/stats`.
- **Current-season vs. career stat split** — career totals are shown;
  splitting by season would need a season boundary defined somewhere.

## Project structure

```
app/
  page.tsx                 Home — everything fetched from Supabase
  races/, results/         Race calendar, detail, results centre (Supabase)
  horses/, jockeys/        Databases + detail pages (Supabase)
  trainers/, stables/, owners/, news/    Databases (Supabase)
  stats/, search/, live/   All Supabase-backed (live's replay list only)
  admin/                   Login + dashboard (Supabase-gated)
  auth/callback/           Handles Supabase email/magic-link redirects
components/
  AdminDashboard.tsx       Admin shell/sidebar, wires every section together
  RacesAdminPanel.tsx      Races/entries/results CRUD UI (bespoke — richer than the generic one)
  EntityAdminPanel.tsx     Generic config-driven CRUD UI, reused for 6 entities
  UsersAdminPanel.tsx      Admin user/role management UI
  HorsesGrid.tsx           Client-side search/sort over server-fetched horses
  ResultsSearch.tsx        Client-side search over server-fetched results
  Header, Footer, Ticker, Countdown, icons
lib/
  races.ts, horses.ts, jockeys.ts, trainers.ts, stables.ts, owners.ts, news.ts, users.ts
                            Supabase read functions, one module per entity
  actions/races.ts         Server Actions (writes) for races/entries/results
  actions/db.ts            Generic whitelisted Server Actions (writes) for the other 6 tables
  actions/users.ts         Server Action for changing a user's admin role
  roles.ts                 Admin role list + check
  supabase/client.ts       Supabase client for Client Components
  supabase/server.ts       Supabase client for Server Components / routes
middleware.ts              Real auth/role check, protects /admin routes
supabase/
  schema.sql               profiles table, RLS, auto-provisioning trigger
  races_schema.sql         races/race_entries/race_results tables + RLS + is_admin() + seed
  entities_schema.sql      horses/jockeys/trainers/stables/owners/news tables + RLS + seed
  race_entries_results_migration.sql   entries/results -> horse_id FK, granular horse stats + trigger
  relational_links_migration.sql       horse/trainer owner/stable/mentor FKs
  streams_schema.sql       streams table + RLS
  scraper_prep_migration.sql   unique indexes needed for the scraper's upserts
  scraper_normalization_migration.sql   name-normalization dedup, jockey_id/trainer_id on results, indexes
scraper/
  scrape.mjs               CLI entry point — node scraper/scrape.mjs <date> [end-date]
  upsert.mjs               Normalized find-or-create + upsert logic, with change detection
  lib/fetchHtml.mjs        Rate-limited, identified fetcher
  lib/parseRacePage.mjs    Race page -> race meta + per-entry gate/horse/weight/jockey/trainer/finish time
  lib/parseHorseProfile.mjs   Horse profile -> owner + country of origin
  lib/normalize.mjs        Name normalization (mirrors the SQL function of the same purpose)
  lib/dateRange.mjs        Date range iteration for historical backfills
  lib/originCodes.mjs      Country-code -> name mapping
  lib/supabaseAdmin.mjs    Service-role Supabase client (server-only, never used by the app)
```
