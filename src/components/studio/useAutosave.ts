"use client";

import { useCallback, useEffect, useRef } from "react";
import { createDesignAction, saveDesignAction } from "@/app/actions/designs";
import { toDoc } from "@/lib/doc";
import { useStudio, type Status } from "@/store/useStudio";

const DEBOUNCE_MS = 1200;

const snapshot = () => {
  const s = useStudio.getState();
  const doc = toDoc(s.nodes, s.edges, s.workload);
  return { doc, json: JSON.stringify(doc), design: s.design };
};

/** Saves the design right now. Creates it the first time (and moves the address bar to its own URL). */
export async function saveNow(status?: Status): Promise<boolean> {
  const { doc, json, design } = snapshot();
  const st = useStudio.getState();
  if (design.shared || design.level === "view") return false;
  st.setSync("saving");
  const nextStatus = status ?? design.status;
  if (!design.id) {
    const r = await createDesignAction({ title: design.title, status: nextStatus, doc, teamId: design.teamId });
    if (!r.ok) { st.setSync("error", r.error); return false; }
    st.markSaved({ id: r.data.id, rev: r.data.rev, json, status: nextStatus });
    window.history.replaceState(null, "", `/app/d/${r.data.id}`);
    return true;
  }
  const r = await saveDesignAction(design.id, { title: design.title, status: nextStatus, doc, baseRev: design.rev });
  if (!r.ok) { st.setSync(/Someone else saved/.test(r.error) ? "conflict" : "error", r.error); return false; }
  st.markSaved({ rev: r.data.rev, json, status: nextStatus });
  return true;
}

/** Autosaves an existing design shortly after each real change, warns before leaving with unsaved work, and binds Ctrl/Cmd+S. */
export function useAutosave() {
  const nodes = useStudio((s) => s.nodes);
  const edges = useStudio((s) => s.edges);
  const workload = useStudio((s) => s.workload);
  const design = useStudio((s) => s.design);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try { await saveNow(); } finally { busy.current = false; }
  }, []);

  // Has anything changed since the last save?
  const dirty = (() => {
    if (!design.id || design.shared || design.level === "view" || design.key == null) return false;
    return design.metaDirty || JSON.stringify(toDoc(nodes, edges, workload)) !== design.lastJson;
  })();

  useEffect(() => {
    if (!dirty || design.sync === "conflict") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [dirty, nodes, edges, workload, design.title, design.status, design.sync, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    const keys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void saveNow("saved"); }
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("keydown", keys);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("keydown", keys); };
  }, [dirty]);

  return { dirty };
}
