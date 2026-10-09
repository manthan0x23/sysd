"use client";

import { useEffect } from "react";
import { Undo2 } from "lucide-react";
import { useStudio } from "@/store/useStudio";

/** After a delete: say what went, and offer to bring it back for a few seconds. */
export function UndoToast() {
  const deleted = useStudio((s) => s.deleted);
  const { undoDelete, dismissDeleted } = useStudio.getState();
  useEffect(() => {
    if (!deleted) return;
    const t = setTimeout(dismissDeleted, 9000);
    return () => clearTimeout(t);
  }, [deleted, dismissDeleted]);
  if (!deleted) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={deleted.at}>
      <span>Deleted <b>{deleted.label}</b></span>
      <button className="pill-btn" onClick={undoDelete}><Undo2 className="ic" size={13} aria-hidden /> Undo</button>
    </div>
  );
}

/** Says why a link was refused, for a few seconds. */
export function LinkNotice() {
  const n = useStudio((s) => s.linkNotice);
  const { setLinkNotice } = useStudio.getState();
  useEffect(() => {
    if (!n) return;
    const t = setTimeout(() => setLinkNotice(null), 5000);
    return () => clearTimeout(t);
  }, [n, setLinkNotice]);
  if (!n) return null;
  return <div className="toast" role="alert" key={n.at}><span>{n.text}</span></div>;
}

/** After "Best value": what changed and what it saves, with a way back. */
export function OptimizeToast() {
  const o = useStudio((s) => s.optimized);
  const { undoOptimized, dismissOptimized } = useStudio.getState();
  useEffect(() => {
    if (!o) return;
    const t = setTimeout(dismissOptimized, 12000);
    return () => clearTimeout(t);
  }, [o, dismissOptimized]);
  if (!o) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={o.at}>
      <span>{o.text}</span>
      <button className="pill-btn" onClick={undoOptimized}><Undo2 className="ic" size={13} aria-hidden /> Undo</button>
    </div>
  );
}
