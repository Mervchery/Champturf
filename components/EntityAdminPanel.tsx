"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { createRow, updateRow, deleteRow } from "@/lib/actions/db";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "checkbox" | "textarea";
  placeholder?: string;
};

export type ColumnDef = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
};

export default function EntityAdminPanel({
  table, title, addLabel, fields, columns, rows, paths, notify,
}: {
  table: string;
  title: string;
  addLabel: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  rows: any[];
  paths: string[];
  notify: (m: string) => void;
}) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
        <h2 className="font-display text-2xl">{title}</h2>
        <button className="btn btn-dark" onClick={() => { setShowNew((v) => !v); setEditingId(null); }}>
          <Plus size={15} /> {addLabel}
        </button>
      </div>

      {showNew && (
        <EntityForm
          fields={fields}
          onCancel={() => setShowNew(false)}
          onSubmit={(values) =>
            handle(() => createRow(table, values, paths), "Created").then(() => setShowNew(false))
          }
        />
      )}

      <div className="panel !p-0 overflow-hidden">
        <table>
          <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.flatMap((row) => [
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? "—")}</td>
                ))}
                <td className="whitespace-nowrap">
                  <button
                    className="text-xs px-2.5 py-1 rounded border border-line mr-1.5"
                    onClick={() => { setEditingId(editingId === row.id ? null : row.id); setShowNew(false); }}
                  >
                    {editingId === row.id ? <X size={13} className="inline" /> : <Pencil size={13} className="inline" />} {editingId === row.id ? "Close" : "Edit"}
                  </button>
                  <button
                    className="text-xs px-2.5 py-1 rounded border border-line"
                    onClick={() => {
                      if (confirm(`Delete this ${title.toLowerCase().replace(/s$/, "")}?`)) {
                        handle(() => deleteRow(table, row.id, paths), "Deleted");
                      }
                    }}
                  >
                    <Trash2 size={13} className="inline" /> Delete
                  </button>
                </td>
              </tr>,
              editingId === row.id ? (
                <tr key={row.id + "-edit"}>
                  <td colSpan={columns.length + 1} className="!p-0">
                    <div className="p-4 bg-parchment2">
                      <EntityForm
                        fields={fields}
                        initial={row}
                        onCancel={() => setEditingId(null)}
                        onSubmit={(values) =>
                          handle(() => updateRow(table, row.id, values, paths), "Saved").then(() => setEditingId(null))
                        }
                      />
                    </div>
                  </td>
                </tr>
              ) : null,
            ])}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="text-sm opacity-60">No rows yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntityForm({ fields, initial, onSubmit, onCancel }: {
  fields: FieldDef[];
  initial?: any;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {};
    for (const f of fields) {
      v[f.key] = initial ? initial[f.key] ?? (f.type === "checkbox" ? false : "") : (f.type === "checkbox" ? false : "");
    }
    return v;
  });

  function setField(key: string, val: any) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function submit() {
    const cleaned: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = values[f.key];
      cleaned[f.key] = f.type === "number" ? (raw === "" ? 0 : Number(raw)) : raw;
    }
    onSubmit(cleaned);
  }

  return (
    <div className="panel mb-5">
      <div className="grid sm:grid-cols-2 gap-3.5">
        {fields.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label className="text-xs opacity-65 block mb-1.5">{f.label}</label>
            {f.type === "checkbox" ? (
              <input type="checkbox" checked={!!values[f.key]} onChange={(e) => setField(f.key, e.target.checked)} className="w-4 h-4" />
            ) : f.type === "textarea" ? (
              <textarea className="input" rows={3} value={values[f.key]} placeholder={f.placeholder} onChange={(e) => setField(f.key, e.target.value)} />
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                className="input"
                value={values[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button className="btn btn-dark" onClick={submit}>Save</button>
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
      <style>{`.input { width: 100%; padding: 9px 11px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); font-size: 0.86rem; }`}</style>
    </div>
  );
}
