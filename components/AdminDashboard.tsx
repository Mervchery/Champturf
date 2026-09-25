"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Flag, Users, GraduationCap, Target, Building2, Newspaper,
  Image as ImageIcon, Radio, BarChart3, ShieldCheck, LogOut, ArrowLeft, Plus, CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { HorseIcon } from "@/components/RacingIcons";
import RacesAdminPanel from "@/components/RacesAdminPanel";
import EntityAdminPanel from "@/components/EntityAdminPanel";
import UsersAdminPanel from "@/components/UsersAdminPanel";
import type { Race } from "@/lib/races";
import type { Horse } from "@/lib/horses";
import type { Jockey } from "@/lib/jockeys";
import type { Trainer } from "@/lib/trainers";
import type { Stable } from "@/lib/stables";
import type { Owner } from "@/lib/owners";
import type { NewsArticle } from "@/lib/news";
import type { Stream } from "@/lib/streams";
import type { Meeting } from "@/lib/meetings";
import type { Profile } from "@/lib/users";

const SECTIONS = [
  ["overview", "Overview", LayoutDashboard],
  ["raceDays", "Race Days", CalendarDays],
  ["races", "Races", Flag],
  ["horses", "Horses", HorseIcon],
  ["jockeys", "Jockeys", Users],
  ["apprentices", "Apprentices", GraduationCap],
  ["trainers", "Trainers", Target],
  ["stables", "Stables", Building2],
  ["owners", "Owners", Users],
  ["news", "News", Newspaper],
  ["media", "Media library", ImageIcon],
  ["stream", "Live streams", Radio],
  ["stats", "Statistics", BarChart3],
  ["users", "Users & roles", ShieldCheck],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

export default function AdminDashboard({
  role, email, races, horses, jockeys, trainers, stables, owners, news, streams, meetings, profiles,
}: {
  role: string; email: string;
  races: Race[]; horses: Horse[]; jockeys: Jockey[]; trainers: Trainer[];
  stables: Stable[]; owners: Owner[]; news: NewsArticle[]; streams: Stream[]; meetings: Meeting[]; profiles: Profile[];
}) {
  const [section, setSection] = useState<SectionId>("overview");
  const [toast, setToast] = useState("");
  const router = useRouter();

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const proJockeys = jockeys.filter((j) => !j.apprentice);
  const apprentices = jockeys.filter((j) => j.apprentice);

  return (
    <div className="grid md:grid-cols-[220px_1fr] min-h-[75vh]">
      <aside className="bg-turf text-white p-4 md:p-6 flex md:flex-col gap-1 overflow-x-auto">
        <div className="hidden md:block text-xs opacity-60 mb-4">
          Signed in as <b className="text-gold2">{email}</b>
          <div className="text-white/50 mt-0.5">{role}</div>
        </div>
        {SECTIONS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-md text-sm whitespace-nowrap ${
              section === id ? "bg-white/10 font-semibold" : "text-white/70"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
        <div className="hidden md:block mt-5 pt-4 border-t border-white/10">
          <button onClick={signOut} className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-md text-sm text-white/70">
            <LogOut size={16} /> Sign out
          </button>
          <a href="/" className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-md text-sm text-white/70">
            <ArrowLeft size={16} /> Exit admin
          </a>
        </div>
      </aside>

      <main className="p-5 md:p-8 bg-parchment relative">
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-parchment px-5 py-3 rounded-full text-sm z-50">
            {toast}
          </div>
        )}

        {section === "overview" && (
          <div>
            <h2 className="font-display text-2xl mb-5">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Kpi label="Total races" value={races.length} />
              <Kpi label="Registered horses" value={horses.length} />
              <Kpi label="Jockeys & apprentices" value={jockeys.length} />
              <Kpi label="Published articles" value={news.length} />
            </div>
            <div className="panel">
              <h4 className="text-sm font-semibold mb-3">At a glance</h4>
              <table>
                <tbody>
                  <tr><td>Trainers</td><td>{trainers.length}</td></tr>
                  <tr><td>Stables</td><td>{stables.length}</td></tr>
                  <tr><td>Owners</td><td>{owners.length}</td></tr>
                  <tr><td>Users with admin access</td><td>{profiles.filter((p) => p.role).length}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "raceDays" && (
          <EntityAdminPanel
            table="meetings" title="Race Days" addLabel="Add race day" notify={notify}
            paths={["/admin", "/race-days"]}
            rows={meetings}
            columns={[
              { key: "race_date", label: "Date" },
              { key: "course", label: "Course" },
              { key: "weather", label: "Weather", render: (row) => row.weather ?? "N/A" },
              { key: "track_condition", label: "Track", render: (row) => row.track_condition ?? "N/A" },
            ]}
            fields={[
              { key: "race_date", label: "Race date (YYYY-MM-DD)", placeholder: "2026-09-12" },
              { key: "course", label: "Course" },
              { key: "weather", label: "Weather", placeholder: "e.g. Sunny, 27°C" },
              { key: "track_condition", label: "Track condition", placeholder: "e.g. Good, Soft, Firm" },
              { key: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        )}
        <p className="text-xs opacity-50 mt-3">
          {section === "raceDays" && "Add a row here for any date that already has races to attach weather and track condition to that meeting — races themselves are still managed under Races."}
        </p>

        {section === "races" && <RacesAdminPanel races={races} horses={horses} jockeys={jockeys} notify={notify} />}

        {section === "horses" && (
          <EntityAdminPanel
            table="horses" title="Horses" addLabel="Add horse" notify={notify}
            paths={["/admin", "/horses", "/"]}
            rows={horses}
            columns={[
              { key: "name", label: "Horse" },
              { key: "trainer", label: "Trainer", render: (row) => row.trainer?.name ?? "Unknown" },
              { key: "rating", label: "Rating", render: (row) => row.rating ?? "N/A" },
              { key: "starts", label: "Starts" },
              { key: "wins", label: "Wins" },
            ]}
            fields={[
              { key: "name", label: "Name" },
              { key: "age", label: "Age", type: "number" },
              { key: "sex", label: "Sex", placeholder: "Colt / Filly / Gelding / Mare" },
              { key: "breed", label: "Breed" },
              { key: "color", label: "Color" },
              { key: "origin", label: "Country of origin" },
              { key: "rating", label: "Rating", type: "number" },
              { key: "photo_url", label: "Photo URL", placeholder: "https://…" },
              { key: "owner_id", label: "Owner", type: "select", options: owners.map((o) => ({ value: o.id, label: o.name })) },
              { key: "trainer_id", label: "Trainer", type: "select", options: trainers.map((t) => ({ value: t.id, label: t.name })) },
              { key: "stable_id", label: "Stable", type: "select", options: stables.map((s) => ({ value: s.id, label: s.name })) },
              { key: "medical_status", label: "Medical status" },
              { key: "silk_image_url", label: "Silk image URL (optional manual override)", placeholder: "https://... — normally filled in automatically by the scraper" },
            ]}
          />
        )}
        <p className="text-xs opacity-50 mt-3">
          {section === "horses" && "Wins/placed/starts/earnings aren't editable here — they're computed automatically from entered race results. Owner/Trainer/Stable are picked from existing records, not typed — renaming one updates every horse that references it. Silk image is normally set by the scraper the first time this horse runs; only fill it in by hand if a horse has never been scraped yet (e.g. a new arrival) or the scraped one needs correcting."}
        </p>

        {section === "jockeys" && (
          <EntityAdminPanel
            table="jockeys" title="Jockeys" addLabel="Add jockey" notify={notify}
            paths={["/admin", "/jockeys", "/"]}
            rows={proJockeys}
            columns={[
              { key: "name", label: "Jockey" },
              { key: "nationality", label: "Nationality", render: (row) => row.nationality ?? "N/A" },
              { key: "wins", label: "Wins" },
            ]}
            fields={[
              { key: "name", label: "Name" },
              { key: "nationality", label: "Nationality" },
              { key: "photo_url", label: "Photo URL", placeholder: "https://…" },
              { key: "suspensions", label: "Suspensions", type: "number" },
              { key: "bio", label: "Biography", type: "textarea" },
              { key: "achievements", label: "Achievements", type: "textarea" },
              { key: "apprentice", label: "Apprentice", type: "checkbox" },
            ]}
          />
        )}
        <p className="text-xs opacity-50 mt-3">
          {section === "jockeys" && "Wins/places/win %/rides aren't editable here — they're computed automatically from entered race results."}
        </p>

        {section === "apprentices" && (
          <EntityAdminPanel
            table="jockeys" title="Apprentices" addLabel="Register trainee" notify={notify}
            paths={["/admin", "/jockeys", "/"]}
            rows={apprentices}
            columns={[
              { key: "name", label: "Apprentice" },
              { key: "mentor", label: "Mentor", render: (row) => row.mentor?.name ?? "Unknown" },
              { key: "allowance", label: "Allowance", render: (row) => row.allowance ?? "N/A" },
            ]}
            fields={[
              { key: "name", label: "Name" },
              { key: "nationality", label: "Nationality" },
              { key: "photo_url", label: "Photo URL", placeholder: "https://…" },
              { key: "mentor_id", label: "Mentor jockey", type: "select", options: proJockeys.map((j) => ({ value: j.id, label: j.name })) },
              { key: "allowance", label: "Allowance", placeholder: "e.g. 3kg" },
              { key: "progress", label: "Progress report", type: "textarea" },
              { key: "apprentice", label: "Apprentice", type: "checkbox" },
            ]}
          />
        )}
        <p className="text-xs opacity-50 mt-3">
          {section === "apprentices" && "Mentor is picked from existing professional jockeys, not typed — renaming a jockey updates every apprentice that references them as mentor. Wins/places/rides aren't editable here — computed automatically from race results, same as professional jockeys."}
        </p>

        {section === "trainers" && (
          <EntityAdminPanel
            table="trainers" title="Trainers" addLabel="Add trainer" notify={notify}
            paths={["/admin", "/trainers", "/horses", "/stats"]}
            rows={trainers}
            columns={[
              { key: "name", label: "Trainer" },
              { key: "stable", label: "Stable", render: (row) => row.stable?.name ?? "Unknown" },
              { key: "wins", label: "Wins" },
            ]}
            fields={[
              { key: "name", label: "Name" },
              { key: "stable_id", label: "Stable", type: "select", options: stables.map((s) => ({ value: s.id, label: s.name })) },
              { key: "photo_url", label: "Photo URL", placeholder: "https://…" },
              { key: "achievements", label: "Achievements", type: "textarea" },
            ]}
          />
        )}
        <p className="text-xs opacity-50 mt-3">
          {section === "trainers" && "Stable is picked from existing records, not typed — renaming a stable updates every trainer (and horse) that references it. Wins/horses trained/ranking aren't editable here — computed automatically from race results and each horse's current trainer."}
        </p>

        {section === "stables" && (
          <EntityAdminPanel
            table="stables" title="Stables" addLabel="Add stable" notify={notify}
            paths={["/admin", "/stables"]}
            rows={stables}
            columns={[
              { key: "name", label: "Stable" },
              { key: "location", label: "Location" },
              { key: "silk_pattern", label: "Silk" },
              { key: "horses", label: "Horses" },
            ]}
            fields={[
              { key: "name", label: "Name" },
              { key: "owner", label: "Owner" },
              { key: "location", label: "Location" },
              { key: "staff", label: "Staff", type: "number" },
              { key: "gallery", label: "Gallery items", type: "number" },
              { key: "trainers", label: "Trainer(s)", placeholder: "Comma-separated" },
              { key: "silk_pattern", label: "Silk pattern", type: "select", options: [
                { value: "plain", label: "Plain" },
                { value: "hoops", label: "Hoops" },
                { value: "stripes", label: "Stripes" },
                { value: "quarters", label: "Quarters" },
                { value: "spots", label: "Spots" },
                { value: "sash", label: "Sash" },
                { value: "chevron", label: "Chevron" },
              ] },
              { key: "silk_primary", label: "Silk primary color", placeholder: "#123C2E" },
              { key: "silk_secondary", label: "Silk secondary color", placeholder: "#E4C878" },
              { key: "silk_cap", label: "Cap color", placeholder: "#123C2E" },
            ]}
          />
        )}
        <p className="text-xs opacity-50 mt-3">
          {section === "stables" && "Horses (count) isn't editable here — computed automatically from how many horses currently have this stable assigned."}
        </p>

        {section === "owners" && (
          <EntityAdminPanel
            table="owners" title="Owners" addLabel="Add owner" notify={notify}
            paths={["/admin", "/owners"]}
            rows={owners}
            columns={[
              { key: "name", label: "Owner" },
              { key: "horses", label: "Horses" },
              { key: "wins", label: "Wins" },
            ]}
            fields={[
              { key: "name", label: "Name" },
              { key: "achievements", label: "Achievements", type: "textarea" },
            ]}
          />
        )}
        <p className="text-xs opacity-50 mt-3">
          {section === "owners" && "Horses (count) and wins aren't editable here — computed automatically from the horses currently assigned to this owner and their race results."}
        </p>

        {section === "news" && (
          <EntityAdminPanel
            table="news" title="News articles" addLabel="New article" notify={notify}
            paths={["/admin", "/news", "/"]}
            rows={news}
            columns={[
              { key: "title", label: "Title" },
              { key: "category", label: "Category" },
              { key: "article_date", label: "Date" },
            ]}
            fields={[
              { key: "title", label: "Title" },
              { key: "category", label: "Category", placeholder: "Race preview / Race review / Interview / Press release" },
              { key: "article_date", label: "Date (YYYY-MM-DD)" },
              { key: "excerpt", label: "Excerpt", type: "textarea" },
            ]}
          />
        )}

        {section === "media" && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-2xl">Media library</h2>
              <button className="btn btn-dark" onClick={() => notify("Media storage isn't wired up yet — see README")}><Plus size={15} /> Upload files</button>
            </div>
            <p className="text-sm opacity-60">
              Not connected yet. The natural next step is Supabase Storage — create a bucket, then swap this
              placeholder for real uploads. Everything else in this dashboard is already real.
            </p>
          </div>
        )}

        {section === "stream" && (
          <EntityAdminPanel
            table="streams" title="Live streams" addLabel="New stream" notify={notify}
            paths={["/admin", "/live"]}
            rows={streams}
            columns={[
              { key: "source", label: "Source" },
              { key: "embed_url", label: "URL", render: (row) => <span className="truncate block max-w-[220px]">{row.embed_url}</span> },
              { key: "status", label: "Status" },
              { key: "race_id", label: "Race", render: (row) => races.find((r) => r.id === row.race_id)?.name ?? "—" },
            ]}
            fields={[
              {
                key: "source", label: "Stream source", type: "select",
                options: [
                  { value: "youtube", label: "YouTube" },
                  { value: "facebook", label: "Facebook Live" },
                  { value: "twitch", label: "Twitch" },
                  { value: "rtmp", label: "Custom RTMP/HLS" },
                ],
              },
              { key: "embed_url", label: "Embed URL", placeholder: "See supabase/streams_schema.sql for the required format per source" },
              {
                key: "race_id", label: "Race (optional)", type: "select",
                options: races.map((r) => ({ value: r.id, label: r.name })),
              },
              {
                key: "status", label: "Status", type: "select",
                options: [
                  { value: "scheduled", label: "Scheduled" },
                  { value: "active", label: "Active (shows on /live)" },
                  { value: "ended", label: "Ended" },
                ],
              },
            ]}
          />
        )}

        {section === "stats" && (
          <div>
            <h2 className="font-display text-2xl mb-5">Statistics</h2>
            <p className="text-sm opacity-70 mb-4">
              Rankings here are computed live from the horses/jockeys/trainers/stables tables — there's nothing
              separate to import or recompute. Edit the underlying records (Horses, Jockeys, Trainers, Stables
              sections) and the public <code>/stats</code> page updates immediately.
            </p>
            <div className="panel">
              <h4 className="text-sm font-semibold mb-3">Current #1 by wins</h4>
              <table>
                <tbody>
                  <tr><td>Horse</td><td>{[...horses].sort((a, b) => b.wins - a.wins)[0]?.name ?? "—"}</td></tr>
                  <tr><td>Jockey</td><td>{[...proJockeys].sort((a, b) => b.wins - a.wins)[0]?.name ?? "—"}</td></tr>
                  <tr><td>Trainer</td><td>{[...trainers].sort((a, b) => b.wins - a.wins)[0]?.name ?? "—"}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "users" && <UsersAdminPanel profiles={profiles} notify={notify} />}
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel">
      <div className="font-mono text-2xl font-semibold">{value}</div>
      <div className="text-xs opacity-60 mt-1">{label}</div>
    </div>
  );
}
