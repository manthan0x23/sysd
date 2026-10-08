"use client";

import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/store/useStudio";

/** A node title that turns into a text field on double-click, so a service can carry a name like "Orders DB". */
export function NodeTitle({ id, name, fallback }: { id: string; name?: string; fallback: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const commit = () => { useStudio.getState().rename(id, draft); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={ref} className="title-input nodrag nopan" value={draft} maxLength={40} placeholder={fallback} aria-label="Service name"
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); e.stopPropagation(); }}
      />
    );
  }
  return (
    <strong onDoubleClick={(e) => { e.stopPropagation(); setDraft(name ?? ""); setEditing(true); }} title="Double-click to rename">
      {name || fallback}
    </strong>
  );
}
