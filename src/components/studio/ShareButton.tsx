"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { createShareAction, listSharesAction, revokeShareAction } from "@/app/actions/shares";
import { useStudio } from "@/store/useStudio";
import { saveNow } from "./useAutosave";

interface Row { id: string; token: string; viewCount: number; createdAt: string; lastViewedAt: string | null; revoked: boolean }

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
};

/** Read-only links to the design, with how many times each was opened. */
export function ShareButton() {
  const design = useStudio((s) => s.design);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async (id: string) => {
    const r = await listSharesAction(id);
    if (r.ok) { setRows(r.data.filter((x) => !x.revoked)); setError(null); } else setError(r.error);
  }, []);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  const create = async () => {
    if (!design.id) return;
    setBusy(true);
    await saveNow(); // make sure the link shows what is on screen
    const r = await createShareAction(design.id);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    await load(design.id);
  };
  const copy = async (t: string) => {
    await navigator.clipboard.writeText(`${location.origin}/s/${t}`);
    setCopied(t); setTimeout(() => setCopied(null), 1600);
  };
  const stop = async (id: string) => {
    const r = await revokeShareAction(id);
    if (!r.ok) return setError(r.error);
    if (design.id) await load(design.id);
  };

  return (
    <div className="share" ref={box}>
      <button className="tb" onClick={() => { const next = !open; setOpen(next); if (next && design.id) void load(design.id); }} aria-expanded={open} aria-haspopup="dialog"><Share2 className="ic" size={15} aria-hidden />Share</button>
      {open && (
        <div className="share-pop" role="dialog" aria-label="Share this design">
          <h3>Share a read-only link</h3>
          {!design.id ? (
            <>
              <p className="note">Save the design first, then you can share it.</p>
              <button className="pill-btn" onClick={async () => { await saveNow("saved"); }}>Save design</button>
            </>
          ) : (
            <>
              <p className="note">Anyone with the link can view this design after signing in. They cannot change it.</p>
              <ul className="share-list">
                {(rows ?? []).map((r) => (
                  <li key={r.id}>
                    <Link2 className="ic" size={14} aria-hidden />
                    <span className="share-url">/s/{r.token.slice(0, 6)}…</span>
                    <span className="share-meta">{r.viewCount} view{r.viewCount === 1 ? "" : "s"} · last {ago(r.lastViewedAt)}</span>
                    <button className="pill-btn" onClick={() => copy(r.token)}>{copied === r.token ? <><Check className="ic" size={12} aria-hidden /> Copied</> : <><Copy className="ic" size={12} aria-hidden /> Copy</>}</button>
                    <button className="pill-btn" onClick={() => stop(r.id)}>Stop</button>
                  </li>
                ))}
                {rows && rows.length === 0 && <li className="note">No links yet.</li>}
              </ul>
              <button className="pill-btn solid" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create a link"}</button>
            </>
          )}
          {error && <p className="note err" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
