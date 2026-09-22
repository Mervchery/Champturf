"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Race, RaceEntry, RaceResult } from "@/lib/races";
import { fmtMoney } from "@/lib/format";
import type { Horse } from "@/lib/horses";
import type { Jockey } from "@/lib/jockeys";
import {
  createRace, deleteRace, updateRace,
  createEntry, deleteEntry,
  upsertResult, deleteResult,
  setRaceVideo, findRaceVideoOnYoutube,
} from "@/lib/actions/races";
import { extractYoutubeId } from "@/lib/youtube";

const ENTRY_SELECT = "*, horses(id, name, trainer, stable, owner, age, sex), jockeys(id, name)";
const RESULT_SELECT = "*, horses(id, name, trainer, stable, owner, age, sex)";

export default function RacesAdminPanel({
  races, horses, jockeys, notify,
}: { races: Race[]; horses: Horse[]; jockeys: Jockey[]; notify: (m: string) => void }) {
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
          horses={horses}
          jockeys={jockeys}
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

function RaceManagePanel({ race, horses, jockeys, notify, onChanged }: {
  race: Race; horses: Horse[]; jockeys: Jockey[]; notify: (m: string) => void; onChanged: () => void;
}) {
  const [entries, setEntries] = useState<RaceEntry[]>([]);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    if (race.status === "upcoming") {
      const { data } = await supabase.from("race_entries").select(ENTRY_SELECT).eq("race_id", race.id).order("gate");
      setEntries((data as any) ?? []);
    } else {
      const { data } = await supabase.from("race_results").select(RESULT_SELECT).eq("race_id", race.id).order("position");
      setResults((data as any) ?? []);
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

  // Results can only be entered for horses actually declared for this race.
  // Falls back to the full horse list if no entries were ever recorded
  // (e.g. a race created and completed without going through the entries step).
  const resultHorseOptions = entries.length > 0
    ? entries.map((e) => e.horses).filter((h): h is NonNullable<typeof h> => !!h)
    : horses;

  return (
    <div className="panel mt-4">
      <h4 className="text-sm font-semibold mb-3">
        {race.status === "upcoming" ? "Entries" : "Results"} — {race.name}
      </h4>

      {loading ? (
        <p className="text-sm opacity-60">Loading…</p>
      ) : race.status === "upcoming" ? (
        <EntriesEditor
          raceId={race.id}
          entries={entries}
          horses={horses}
          jockeys={jockeys}
          onAdd={(input) => handle(() => createEntry(input), "Entry added")}
          onDelete={(id) => handle(() => deleteEntry(id, race.id), "Entry removed")}
        />
      ) : (
        <>
          <ResultsEditor
            raceId={race.id}
            results={results}
            horseOptions={resultHorseOptions}
            onSave={(input) => handle(() => upsertResult(input), "Result saved — horse stats updated automatically")}
            onDelete={(id) => handle(() => deleteResult(id, race.id), "Result removed — horse stats updated automatically")}
          />
          <ReplayVideoEditor race={race} notify={notify} onChanged={onChanged} />
        </>
      )}
    </div>
  );
}

function ReplayVideoEditor({ race, notify, onChanged }: { race: Race; notify: (m: string) => void; onChanged: () => void }) {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState(race.name);
  const [searching, setSearching] = useState(false);

  async function saveManual() {
    const videoId = extractYoutubeId(url);
    if (!videoId) {
      notify("That doesn't look like a YouTube URL or video ID.");
      return;
    }
    try {
      await setRaceVideo(race.id, videoId);
      notify("Replay video saved.");
      setUrl("");
      onChanged();
    } catch (e: any) {
      notify(e.message || "Something went wrong.");
    }
  }

  async function autoFind() {
    if (!query.trim()) {
      notify("Enter a search query first.");
      return;
    }
    setSearching(true);
    try {
      const result = await findRaceVideoOnYoutube(race.id, query.trim(), race.race_date);
      if (result.ok) {
        notify("Found and saved a replay video.");
        onChanged();
      } else {
        notify(result.error);
      }
    } catch (e: any) {
      notify(e.message || "Something went wrong.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="panel mt-4">
      <h4 className="text-sm font-semibold mb-3">Replay video</h4>
      {race.youtube_video_id ? (
        <div className="flex items-center gap-3 mb-3">
          <span className="pill pill-gold">Linked: {race.youtube_video_id}</span>
          <button className="text-xs px-2.5 py-1 rounded border border-line" onClick={() => setRaceVideo(race.id, null).then(() => { notify("Replay unlinked."); onChanged(); })}>
            Remove
          </button>
        </div>
      ) : (
        <p className="text-xs opacity-60 mb-3">No replay linked yet.</p>
      )}
      <div className="flex gap-2 flex-wrap items-end mb-2.5">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs opacity-65 block mb-1">YouTube search query</label>
          <input className="admin-input w-full" placeholder="What to search for…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn btn-outline" onClick={autoFind} disabled={searching}>
          {searching ? "Searching…" : "Auto-find on YouTube"}
        </button>
      </div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs opacity-65 block mb-1">Paste a YouTube URL</label>
          <input className="admin-input w-full" placeholder="https://youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <button className="btn btn-dark" onClick={saveManual}>Save</button>
      </div>
      <p className="text-xs opacity-50 mt-2.5">
        Auto-find calls the YouTube Data API (needs YOUTUBE_API_KEY set — see README): it searches the query above, restricted to videos uploaded within 14 days of this race's date (for uniqueness across years), and saves the first result under 5 minutes so a full race-day broadcast doesn't get linked instead. Each click uses real API quota, so it's manual, not automatic.
      </p>
    </div>
  );
}

function EntriesEditor({ raceId, entries, horses, jockeys, onAdd, onDelete }: {
  raceId: string; entries: RaceEntry[]; horses: Horse[]; jockeys: Jockey[];
  onAdd: (input: { race_id: string; runner_no: number | null; gate: number | null; horse_id: string; jockey_id: string | null; weight_kg: number | null; odds: string | null }) => void;
  onDelete: (id: string) => void;
}) {
  const [runnerNo, setRunnerNo] = useState("");
  const [gate, setGate] = useState("");
  const [horseId, setHorseId] = useState("");
  const [jockeyId, setJockeyId] = useState("");
  const [weight, setWeight] = useState("");
  const [odds, setOdds] = useState("");

  // A horse already entered in this race can't be entered again.
  const enteredHorseIds = new Set(entries.map((e) => e.horse_id));
  const availableHorses = horses.filter((h) => !enteredHorseIds.has(h.id));

  return (
    <div>
      <table className="mb-4">
        <thead><tr><th>No.</th><th>Gate</th><th>Horse</th><th>Stable</th><th>Trainer</th><th>Jockey</th><th>Weight</th><th>Odds</th><th /></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.runner_no ?? "N/A"}</td>
              <td>{e.gate ?? "N/A"}</td>
              <td className="font-semibold">{e.horses?.name ?? "Unknown"}</td>
              <td>{e.horses?.stable?.name ?? "Unknown"}</td>
              <td>{e.horses?.trainer?.name ?? "Unknown"}</td>
              <td>{e.jockeys?.name ?? "Unknown"}</td>
              <td>{e.weight_kg ? `${e.weight_kg}kg` : "N/A"}</td>
              <td>{e.odds ?? "N/A"}</td>
              <td><button className="text-xs px-2 py-1 rounded border border-line" onClick={() => onDelete(e.id)}><Trash2 size={12} /></button></td>
            </tr>
          ))}
          {entries.length === 0 && <tr><td colSpan={9} className="opacity-60 text-sm">No entries yet.</td></tr>}
        </tbody>
      </table>
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <label className="text-xs opacity-65 block mb-1">No.</label>
          <input type="number" className="admin-input w-20" value={runnerNo} onChange={(e) => setRunnerNo(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Gate</label>
          <input type="number" className="admin-input w-20" value={gate} onChange={(e) => setGate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Horse</label>
          <select className="admin-input" value={horseId} onChange={(e) => setHorseId(e.target.value)}>
            <option value="">Select a registered horse…</option>
            {availableHorses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Jockey</label>
          <select className="admin-input" value={jockeyId} onChange={(e) => setJockeyId(e.target.value)}>
            <option value="">Not yet assigned</option>
            {jockeys.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Weight (kg)</label>
          <input type="number" className="admin-input w-24" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Odds</label>
          <input className="admin-input w-24" placeholder="5/2" value={odds} onChange={(e) => setOdds(e.target.value)} />
        </div>
        <button
          className="btn btn-dark"
          onClick={() => {
            if (!horseId) return;
            onAdd({
              race_id: raceId,
              runner_no: runnerNo ? Number(runnerNo) : null,
              gate: gate ? Number(gate) : null,
              horse_id: horseId,
              jockey_id: jockeyId || null,
              weight_kg: weight ? Number(weight) : null,
              odds: odds || null,
            });
            setRunnerNo(""); setGate(""); setHorseId(""); setJockeyId(""); setWeight(""); setOdds("");
          }}
        >
          Add entry
        </button>
      </div>
      {horses.length === 0 && (
        <p className="text-xs opacity-60 mt-2.5">No horses registered yet — add horses first, under the Horses section.</p>
      )}
      <style>{`.admin-input { padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); font-size: 0.84rem; }`}</style>
    </div>
  );
}

function ResultsEditor({ raceId, results, horseOptions, onSave, onDelete }: {
  raceId: string; results: RaceResult[]; horseOptions: { id: string; name: string }[];
  onSave: (input: { race_id: string; position: number; horse_id: string; jockey: string; finish_time: string; margin: string | null; starting_price: string | null; performance_rating: number | null }) => void;
  onDelete: (id: string) => void;
}) {
  const [position, setPosition] = useState("");
  const [horseId, setHorseId] = useState("");
  const [jockey, setJockey] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [margin, setMargin] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [performanceRating, setPerformanceRating] = useState("");

  return (
    <div>
      <table className="mb-4">
        <thead><tr><th>Pos</th><th>Horse</th><th>Jockey</th><th>Time</th><th>Margin</th><th>SP</th><th>Perf.</th><th /></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id}>
              <td>{r.position}</td><td>{r.horses?.name ?? "Unknown"}</td><td>{r.jockey || "Unknown"}</td>
              <td className="font-mono">{r.finish_time ?? "N/A"}</td>
              <td>{r.margin ?? "N/A"}</td>
              <td>{r.starting_price ?? "N/A"}</td>
              <td>{r.performance_rating ?? "N/A"}</td>
              <td><button className="text-xs px-2 py-1 rounded border border-line" onClick={() => onDelete(r.id)}><Trash2 size={12} /></button></td>
            </tr>
          ))}
          {results.length === 0 && <tr><td colSpan={8} className="opacity-60 text-sm">No result entered yet.</td></tr>}
        </tbody>
      </table>
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <label className="text-xs opacity-65 block mb-1">Position</label>
          <input type="number" className="admin-input w-20" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Horse</label>
          <select className="admin-input" value={horseId} onChange={(e) => setHorseId(e.target.value)}>
            <option value="">Select a horse…</option>
            {horseOptions.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Jockey</label>
          <input className="admin-input" value={jockey} onChange={(e) => setJockey(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Time</label>
          <input className="admin-input" placeholder="1:24.10" value={finishTime} onChange={(e) => setFinishTime(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Margin</label>
          <input className="admin-input w-24" placeholder="1.5L" value={margin} onChange={(e) => setMargin(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Starting price</label>
          <input className="admin-input w-24" placeholder="5/2" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} />
        </div>
        <div>
          <label className="text-xs opacity-65 block mb-1">Perf. rating</label>
          <input type="number" className="admin-input w-24" value={performanceRating} onChange={(e) => setPerformanceRating(e.target.value)} />
        </div>
        <button
          className="btn btn-dark"
          onClick={() => {
            if (!position || !horseId || !jockey) return;
            onSave({
              race_id: raceId, position: Number(position), horse_id: horseId, jockey, finish_time: finishTime,
              margin: margin || null, starting_price: startingPrice || null,
              performance_rating: performanceRating ? Number(performanceRating) : null,
            });
            setPosition(""); setHorseId(""); setJockey(""); setFinishTime("");
            setMargin(""); setStartingPrice(""); setPerformanceRating("");
          }}
        >
          Save result
        </button>
      </div>
      <p className="text-xs opacity-60 mt-2.5">
        Enter every finisher, not just the podium — a horse's starts/unplaced count depends on a result row existing for it.
      </p>
      <style>{`.admin-input { padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); font-size: 0.84rem; }`}</style>
    </div>
  );
}
