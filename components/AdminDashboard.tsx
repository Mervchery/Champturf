"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Flag, Users, GraduationCap, Target, Building2, Newspaper,
  Image as ImageIcon, Radio, BarChart3, ShieldCheck, LogOut, ArrowLeft, Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { HorseIcon } from "@/components/RacingIcons";
import { RACES, HORSES, JOCKEYS, TRAINERS, STABLES, NEWS, fmtMoney } from "@/lib/data";

const SECTIONS = [
  ["overview", "Overview", LayoutDashboard],
  ["races", "Races", Flag],
  ["horses", "Horses", HorseIcon],
  ["jockeys", "Jockeys", Users],
  ["apprentices", "Apprentices", GraduationCap],
  ["trainers", "Trainers", Target],
  ["stables", "Stables", Building2],
  ["news", "News", Newspaper],
  ["media", "Media library", ImageIcon],
  ["stream", "Live streams", Radio],
  ["stats", "Statistics", BarChart3],
  ["users", "Users & roles", ShieldCheck],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

export default function AdminDashboard({ role, email }: { role: string; email: string }) {
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
              <Kpi label="Total races" value={RACES.length} />
              <Kpi label="Registered horses" value={HORSES.length} />
              <Kpi label="Jockeys & apprentices" value={JOCKEYS.length} />
              <Kpi label="Published articles" value={NEWS.length} />
            </div>
            <div className="panel">
              <h4 className="text-sm font-semibold mb-3">Recent admin activity</h4>
              <table>
                <tbody>
                  <tr><td>Race result entered</td><td>Grand Prix de Port Louis</td><td className="opacity-60 text-xs">2 days ago</td></tr>
                  <tr><td>Horse profile updated</td><td>Île Royale — medical status</td><td className="opacity-60 text-xs">3 days ago</td></tr>
                  <tr><td>Article published</td><td>Trainer Alicia Ramtohul interview</td><td className="opacity-60 text-xs">4 days ago</td></tr>
                  <tr><td>Stream scheduled</td><td>Coupe d&apos;Or de Maurice — YouTube</td><td className="opacity-60 text-xs">5 days ago</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "races" && (
          <AdminTable
            title="Races" addLabel="New race" notify={notify}
            cols={["Race", "Date", "Status"]}
            rows={RACES.map((r) => [r.name, r.date, r.status])}
          />
        )}

        {section === "horses" && (
          <AdminTable
            title="Horses" addLabel="Add horse" notify={notify}
            cols={["Horse", "Trainer", "Wins"]}
            rows={HORSES.map((h) => [h.name, h.trainer, String(h.wins)])}
            extraAction={{ label: "Photos", onClick: (name) => notify(`Photo upload dialog — ${name}`) }}
          />
        )}

        {section === "jockeys" && (
          <AdminTable
            title="Jockeys" addLabel="Add jockey" notify={notify}
            cols={["Jockey", "Nationality", "Wins"]}
            rows={JOCKEYS.filter((j) => !j.apprentice).map((j) => [j.name, j.nat, String(j.wins)])}
          />
        )}

        {section === "apprentices" && (
          <AdminTable
            title="Apprentices" addLabel="Register trainee" notify={notify}
            cols={["Apprentice", "Mentor", "Allowance"]}
            rows={JOCKEYS.filter((j) => j.apprentice).map((j) => [j.name, j.mentor || "—", j.allowance || "—"])}
          />
        )}

        {section === "trainers" && (
          <AdminTable
            title="Trainers" addLabel="Add trainer" notify={notify}
            cols={["Trainer", "Stable", "Wins"]}
            rows={TRAINERS.map((t) => [t.name, t.stable, String(t.wins)])}
          />
        )}

        {section === "stables" && (
          <AdminTable
            title="Stables" addLabel="Add stable" notify={notify}
            cols={["Stable", "Location", "Horses"]}
            rows={STABLES.map((s) => [s.name, s.location, String(s.horses)])}
            extraAction={{ label: "Assign horses", onClick: (name) => notify(`Assign horses — ${name}`) }}
          />
        )}

        {section === "news" && (
          <AdminTable
            title="News articles" addLabel="New article" notify={notify}
            cols={["Title", "Category", "Date"]}
            rows={NEWS.map((n) => [n.title, n.cat, n.date])}
            extraAction={{ label: "Unpublish", onClick: (name) => notify(`Unpublished — ${name}`) }}
          />
        )}

        {section === "media" && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-2xl">Media library</h2>
              <button className="btn btn-dark" onClick={() => notify("Upload dialog opened")}><Plus size={15} /> Upload files</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["Photo finish R4", "Île Royale portrait", "Grand Prix replay", "Race report PDF", "Champ de Mars aerial", "Apprentice highlights"].map((m) => (
                <div key={m} className="card p-6 text-center">
                  <ImageIcon size={22} className="mx-auto opacity-60" />
                  <div className="text-xs opacity-60 mt-2">{m}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "stream" && (
          <div>
            <h2 className="font-display text-2xl mb-5">Live stream management</h2>
            <div className="panel">
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs opacity-65 block mb-1.5">Stream source</label>
                  <select className="w-full px-3 py-2.5 border border-line rounded-md bg-surface text-sm">
                    <option>YouTube</option><option>Facebook Live</option><option>Twitch</option><option>Custom RTMP/HLS</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-65 block mb-1.5">Stream URL</label>
                  <input placeholder="https://…" className="w-full px-3 py-2.5 border border-line rounded-md bg-surface text-sm" />
                </div>
                <div>
                  <label className="text-xs opacity-65 block mb-1.5">Race</label>
                  <select className="w-full px-3 py-2.5 border border-line rounded-md bg-surface text-sm">
                    {RACES.map((r) => <option key={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-65 block mb-1.5">Status</label>
                  <select className="w-full px-3 py-2.5 border border-line rounded-md bg-surface text-sm">
                    <option>Scheduled</option><option>Active</option><option>Ended</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-dark mt-4" onClick={() => notify("Stream saved (demo)")}>Save stream</button>
            </div>
          </div>
        )}

        {section === "stats" && (
          <div>
            <h2 className="font-display text-2xl mb-5">Statistics management</h2>
            <div className="panel">
              <p className="text-sm opacity-70 mb-3.5">Import season data or manually recompute leaderboard rankings.</p>
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-outline" onClick={() => notify("CSV import started (demo)")}>Import CSV</button>
                <button className="btn btn-outline" onClick={() => notify("Export generated (demo)")}>Export data</button>
                <button className="btn btn-dark" onClick={() => notify("Rankings recomputed (demo)")}>Recompute rankings</button>
              </div>
            </div>
          </div>
        )}

        {section === "users" && (
          <AdminTable
            title="Users & roles" addLabel="Invite user" notify={notify}
            cols={["User", "Role"]}
            rows={[
              ["R. Appadoo", "Super Admin"], ["J. Fanchette", "Race Manager"], ["L. Bathfield", "Editor"],
              ["P. Curpen", "Statistician"], ["S. Yoo", "Stream Operator"],
            ]}
            extraAction={{ label: "Change role", onClick: (name) => notify(`Role dialog — ${name}`) }}
          />
        )}
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

function AdminTable({
  title, addLabel, cols, rows, notify, extraAction,
}: {
  title: string; addLabel: string; cols: string[]; rows: string[][];
  notify: (m: string) => void;
  extraAction?: { label: string; onClick: (name: string) => void };
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display text-2xl">{title}</h2>
        <button className="btn btn-dark" onClick={() => notify(`${addLabel} form would open here`)}><Plus size={15} /> {addLabel}</button>
      </div>
      <div className="panel">
        <table>
          <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell}</td>)}
                <td className="whitespace-nowrap">
                  <button className="text-xs px-2.5 py-1 rounded border border-line mr-1.5" onClick={() => notify(`Editing ${row[0]}`)}>Edit</button>
                  {extraAction && (
                    <button className="text-xs px-2.5 py-1 rounded border border-line mr-1.5" onClick={() => extraAction.onClick(row[0])}>{extraAction.label}</button>
                  )}
                  <button className="text-xs px-2.5 py-1 rounded border border-line" onClick={() => notify(`Removed (demo) — ${row[0]}`)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
