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
