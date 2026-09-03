# Champ Turf — Mauritius Horse Racing Platform

A deployable Next.js (App Router + TypeScript + Tailwind CSS) starter for a
Mauritius horse racing site: race calendar, horse/jockey/trainer/stable/owner
databases, news, statistics, results, live-stream page, global search, and a
role-gated admin dashboard backed by **Supabase Auth**.

Icons are from [lucide-react](https://lucide.dev) plus a few bespoke SVGs in
`components/RacingIcons.tsx` — no emoji anywhere in the UI.

## What's real vs. mocked

| Layer | Current state | To make production-ready |
|---|---|---|
| Data | Static, fictional mock data in `lib/data.ts` | Replace with Supabase Postgres tables (see below) |
| Admin auth | **Real** — Supabase Auth, server-verified on every request | Create real admin users + set their roles (a few SQL commands, see below) |
| Live stream / chat | Static mock UI | Wire to actual embed URLs and a realtime service (Supabase Realtime, Pusher, Ably) |
| PDF export | Button stub | Wire to a real report-generation endpoint |

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
3. In the **SQL Editor**, run `supabase/schema.sql`. This creates a
   `profiles` table (one row per user, holding their admin `role`), locks it
   down with row-level security, and adds a trigger so every new signup
   automatically gets a profile row (with no role, i.e. not an admin yet).
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

## Wiring up a real database

The mock data module (`lib/data.ts`) exports plain typed arrays (`HORSES`,
`RACES`, …) and functions (`horseById`, `search`, etc.). Since you're already
on Supabase, the natural move is Supabase Postgres for this too:

1. In the SQL Editor, create tables mirroring the types already in
   `lib/data.ts` (`horses`, `jockeys`, `trainers`, `stables`, `owners`,
   `races`, `race_results`, `news`).
2. Replace the exported arrays/functions in `lib/data.ts` with Supabase
   queries (`createClient().from("horses").select("*")`, etc.), keeping the
   same function names — pages already import from `@/lib/data`, so most
   files won't need to change. Use `lib/supabase/server.ts` in Server
   Components, `lib/supabase/client.ts` in client components.
3. Add row-level security policies for public read access on these tables
   (they're not sensitive like `profiles`), and restrict writes to admin
   roles if you build write access into the dashboard later.

## Project structure

```
app/
  page.tsx                 Home
  races/                   Race calendar + detail
  horses/, jockeys/        Databases + detail pages
  trainers/, stables/, owners/
  news/, stats/, results/, live/, search/
  admin/                   Login + dashboard (Supabase-gated)
  auth/callback/           Handles Supabase email/magic-link redirects
components/                Header, Footer, Ticker, Countdown, AdminDashboard, icons
lib/data.ts                Mock data + query helpers (swap for Supabase queries)
lib/roles.ts                Admin role list + check
lib/supabase/client.ts     Supabase client for Client Components
lib/supabase/server.ts     Supabase client for Server Components / routes
middleware.ts              Real auth/role check, protects /admin routes
supabase/schema.sql        profiles table, RLS, and auto-provisioning trigger
```
