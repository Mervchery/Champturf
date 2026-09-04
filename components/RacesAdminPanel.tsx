"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Race, RaceEntry, RaceResult } from "@/lib/races";
import { fmtMoney } from "@/lib/races";
import {
  createRace, deleteRace, updateRace,
  createEntry, deleteEntry,
  upsertResult, deleteResult,
} from "@/lib/actions/races";

export default function RacesAdminPanel({ races, notify }: { races: Race[]; notify: (m: string) => void }) {
  const router = useRouter();
  const [showNewRace, setShowNewRace] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handle(action: () => Promise<void>, successMsg: string) {
    try {
      await action();
      notify(successMsg);
      router.refresh();
    } catch (e: any) {
      notify(e.message || "Something went wrong.");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-display text-2xl">Races</h2>
        <button className="btn btn-dark" onClick={() => setShowNewRace((v) => !v)}>
          <Plus size={15} /> New race
        </button>
      </div>

      {showNewRace && (
        <NewRaceForm
          onCancel={() => setShowNewRace(false)}
          onSubmit={async (input) => {
            await handle(() => createRace(input), `Created "${input.name}"`);
            setShowNewRace(false);
          }}
        />
      )}

      <div className="panel !p-0 overflow-hidden">
        <table>
          <thead><tr><th>Race</th><th>Date</th><th>Status</th><th>Prize</th><th /></tr></thead>
          <tbody>
            {races.map((r) => (
              <tr key={r.id}>
                <td className="font-semibold">{r.name}</td>
                <td>{r.race_date}</td>
                <td>
                  <button
                    className={`pill ${r.status === "upcoming" ? "pill-gold" : "pill-outline"}`}
                    onClick={() =>
                      handle(
                        () => updateRace(r.id, { status: r.status === "upcoming" ? "completed" : "upcoming" }),
                        `Marked ${r.status === "upcoming" ? "completed" : "upcoming"}`
                      )
                    }
                    title="Click to toggle status"
                  >
                    {r.status}
                  </button>
                </td>
                <td>{fmtMoney(r.prize)}</td>
                <td className="whitespace-nowrap">
                  <button
                    className="text-xs px-2.5 py-1 rounded border border-line mr-1.5"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    {expanded === r.id ? <ChevronUp size={13} className="inline" /> : <ChevronDown size={13} className="inline" />} Manage
                  </button>
                  <button
                    className="text-xs px-2.5 py-1 rounded border border-line"
                    onClick={() => {
                      if (confirm(`Delete "${r.name}"? This also removes its entries and results.`)) {
                        handle(() => deleteRace(r.id), `Deleted "${r.name}"`);
                      }
                    }}
                  >
                    <Trash2 size={13} className="inline" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expanded && (
        <RaceManagePanel
          race={races.find((r) => r.id === expanded)!}
          notify={notify}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

function NewRaceForm({ onSubmit, onCancel }: { onSubmit: (input: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: "", course: "Champ de Mars", race_date: "", race_time: "15:00",
    distance: "", prize: 0, status: "upcoming", conditions: "",
  });

  return (
    <div className="panel mb-5">
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field label="Race name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Course"><input className="input" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></Field>
        <Field label="Date"><input type="date" className="input" value={form.race_date} onChange={(e) => setForm({ ...form, race_date: e.target.value })} /></Field>
        <Field label="Time"><input type="time" className="input" value={form.race_time} onChange={(e) => setForm({ ...form, race_time: e.target.value })} /></Field>
        <Field label="Distance"><input className="input" placeholder="e.g. 1600m" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} /></Field>
        <Field label="Prize (Rs)"><input type="number" className="input" value={form.prize} onChange={(e) => setForm({ ...form, prize: Number(e.target.value) })} /></Field>
        <Field label="Status">
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
        <Field label="Conditions"><input className="input" placeholder="e.g. Handicap, 4yo+" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} /></Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          className="btn btn-dark"
          onClick={() => {
            if (!form.name || !form.race_date) return;
            onSubmit(form);
          }}
        >
          Create race
        </button>
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
      <style>{`.input { width: 100%; padding: 9px 11px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); font-size: 0.86rem; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs opacity-65 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function RaceManagePanel({ race, notify, onChanged }: { race: Race; notify: (m: string) => void; onChanged: () => void }) {
  const [entries, setEntries] = useState<RaceEntry[]>([]);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    if (race.status === "upcoming") {
      const { data } = await supabase.from("race_entries").select("*").eq("race_id", race.id).order("gate");
      setEntries(data ?? []);
    } else {
      const { data } = await supabase.from("race_results").select("*").eq("race_id", race.id).order("position");
      setResults(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race.id, race.status]);

  async function handle(action: () => Promise<void>, successMsg: string) {
    try {
      await action();
      notify(successMsg);
      await load();
      onChanged();
    } catch (e: any) {
      notify(e.message || "Something went wrong.");
    }
  }

  return (
    <div className="panel mt-4">
      <h4 className="text-sm font-semibold mb-3">
        {race.status === "upcoming" ? "Entries" : "Results"} — {race.name}
      </h4>

      {loading ? (
        <p className="text-sm opacity-60">Loading…</p>
      ) : race.status === "upcoming" ? (
        <EntriesEditor raceId={race.id} entries={entries} onAdd={(input) => handle(() => createEntry(input), "Entry added")} onDelete={(id) => handle(() => deleteEntry(id, race.id), "Entry removed")} />
      ) : (
        <ResultsEditor raceId={race.id} results={results} onSave={(input) => handle(() => upsertResult(input), "Result saved")} onDelete={(id) => handle(() => deleteResult(id, race.id), "Result removed")} />
      )}
    </div>
  );
}

function EntriesEditor({ raceId, entries, onAdd, onDelete }: {
  raceId: string; entries: RaceEntry[];
  onAdd: (input: { race_id: string; gate: number | null; horse_name: string; trainer: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [gate, setGate] = useState("");
  const [horseName, setHorseName] = useState("");
  const [trainer, setTrainer] = useState("");

  return (
    <div>
      <table className="mb-4">
        <thead><tr><th>Gate</th><th>Horse</th><th>Trainer</th><th /></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.gate ?? "—"}</td><td>{e.horse_name}</td><td>{e.trainer ?? "—"}</td>
              <td><button className="text-xs px-2 py-1 rounded border border-line" onClick={() => onDelete(e.id)}><Trash2 size={12} /></button></td>
            </tr>
          ))}
          {entries.length === 0 && <tr><td colSpan={4} className="opacity-60 text-sm">No entries yet.</td></tr>}
        </tbody>
      </table>
      <div className="flex gap-2 flex-wrap items-end">
        <div><label className="text-xs opacity-65 block mb-1">Gate</label><input type="number" className="admin-input w-20" value={gate} onChange={(e) => setGate(e.target.value)} /></div>
        <div><label className="text-xs opacity-65 block mb-1">Horse</label><input className="admin-input" value={horseName} onChange={(e) => setHorseName(e.target.value)} /></div>
        <div><label className="text-xs opacity-65 block mb-1">Trainer</label><input className="admin-input" value={trainer} onChange={(e) => setTrainer(e.target.value)} /></div>
        <button
          className="btn btn-dark"
          onClick={() => {
            if (!horseName) return;
            onAdd({ race_id: raceId, gate: gate ? Number(gate) : null, horse_name: horseName, trainer });
            setGate(""); setHorseName(""); setTrainer("");
          }}
        >
          Add entry
        </button>
      </div>
      <style>{`.admin-input { padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); font-size: 0.84rem; }`}</style>
    </div>
  );
}

function ResultsEditor({ raceId, results, onSave, onDelete }: {
  raceId: string; results: RaceResult[];
  onSave: (input: { race_id: string; position: number; horse_name: string; jockey: string; finish_time: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [position, setPosition] = useState("");
  const [horseName, setHorseName] = useState("");
  const [jockey, setJockey] = useState("");
  const [finishTime, setFinishTime] = useState("");

  return (
    <div>
      <table className="mb-4">
        <thead><tr><th>Pos</th><th>Horse</th><th>Jockey</th><th>Time</th><th /></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id}>
              <td>{r.position}</td><td>{r.horse_name}</td><td>{r.jockey}</td><td className="font-mono">{r.finish_time}</td>
              <td><button className="text-xs px-2 py-1 rounded border border-line" onClick={() => onDelete(r.id)}><Trash2 size={12} /></button></td>
            </tr>
          ))}
          {results.length === 0 && <tr><td colSpan={5} className="opacity-60 text-sm">No result entered yet.</td></tr>}
        </tbody>
      </table>
      <div className="flex gap-2 flex-wrap items-end">
        <div><label className="text-xs opacity-65 block mb-1">Position</label><input type="number" className="admin-input w-20" value={position} onChange={(e) => setPosition(e.target.value)} /></div>
        <div><label className="text-xs opacity-65 block mb-1">Horse</label><input className="admin-input" value={horseName} onChange={(e) => setHorseName(e.target.value)} /></div>
        <div><label className="text-xs opacity-65 block mb-1">Jockey</label><input className="admin-input" value={jockey} onChange={(e) => setJockey(e.target.value)} /></div>
        <div><label className="text-xs opacity-65 block mb-1">Time</label><input className="admin-input" placeholder="1:24.10" value={finishTime} onChange={(e) => setFinishTime(e.target.value)} /></div>
        <button
          className="btn btn-dark"
          onClick={() => {
            if (!position || !horseName || !jockey) return;
            onSave({ race_id: raceId, position: Number(position), horse_name: horseName, jockey, finish_time: finishTime });
            setPosition(""); setHorseName(""); setJockey(""); setFinishTime("");
          }}
        >
          Save result
        </button>
      </div>
      <style>{`.admin-input { padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); font-size: 0.84rem; }`}</style>
    </div>
  );
}
