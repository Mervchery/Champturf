"use client";

import type { ReactNode } from "react";

type Option<V extends string> = { value: V; label: ReactNode; title?: string };

/** A compact segmented control (radio-group semantics) used by the More menu settings. */
export default function Segmented<V extends string>({
  label, options, value, onChange, pending = false,
}: {
  label: string;
  options: Option<V>[];
  value: V;
  onChange: (v: V) => void;
  pending?: boolean;
}) {
  return (
    <div className={`seg ${pending ? "is-pending" : ""}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`seg-btn ${value === o.value ? "is-active" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
