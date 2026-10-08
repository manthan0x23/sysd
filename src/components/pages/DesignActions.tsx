"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDesignAction, duplicateDesignAction } from "@/app/actions/designs";

export function DesignActions({ id, canDelete }: { id: string; canDelete: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const dup = () => start(async () => {
    const r = await duplicateDesignAction(id);
    if (r.ok) router.push(`/app/d/${r.data.id}`); else setError(r.error);
  });
  const del = () => start(async () => {
    const r = await deleteDesignAction(id);
    if (r.ok) { setConfirm(false); router.refresh(); } else setError(r.error);
  });

  return (
    <span className="acts">
      <button className="pill-btn" onClick={dup} disabled={pending}>Duplicate</button>
      {canDelete && !confirm && <button className="pill-btn" onClick={() => setConfirm(true)} disabled={pending}>Delete</button>}
      {canDelete && confirm && (
        <>
          <button className="pill-btn danger" onClick={del} disabled={pending}>Delete for good</button>
          <button className="pill-btn" onClick={() => setConfirm(false)}>Keep</button>
        </>
      )}
      {error && <span className="note err" role="alert">{error}</span>}
    </span>
  );
}
