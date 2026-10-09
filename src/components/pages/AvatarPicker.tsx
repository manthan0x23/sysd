"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { requestUploadAction, setAvatarAction } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";
import { BrandIcon } from "@/components/studio/BrandIcon";
import { squareImage } from "@/lib/resizeImage";
import { LETTERS, LETTER_STYLES, LOGO_CHOICES, PEOPLE, defaultAvatar, formatAvatar, parseAvatar, type AvatarSpec } from "@/lib/avatar";

type Tab = "letters" | "logos" | "people" | "upload";
const BASE_TABS: { id: Tab; label: string }[] = [{ id: "letters", label: "Letters" }, { id: "logos", label: "Logos" }, { id: "people", label: "People" }];
const MAX_BYTES = 256 * 1024;
export type PickerTarget = { scope: "avatar" } | { scope: "team"; teamId: string };
type Saved = { ok: true } | { ok: false; error: string };
/** Uploads need the bucket's public address at build time; the server also refuses when its keys are missing. */
const UPLOADS_ON = Boolean(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);

/** A dialog to pick an avatar: a letter or digit on a colour, a logo, or a drawn person. Saves on "Save". */
export function AvatarPicker({ current, name, onClose, title = "Choose your avatar", hint = "This is how you appear to your team.", target = { scope: "avatar" }, onSave }: {
  current: string | null; name: string; onClose: () => void; title?: string; hint?: string;
  /** Where an uploaded image goes (your avatar, or a team's logo). */
  target?: PickerTarget;
  /** Saves the chosen value. Defaults to your own avatar. */
  onSave?: (value: string) => Promise<Saved>;
}) {
  const tabs = UPLOADS_ON ? [...BASE_TABS, { id: "upload" as Tab, label: "Upload" }] : BASE_TABS;
  const router = useRouter();
  const start: AvatarSpec = parseAvatar(current) ?? defaultAvatar(name);
  const [spec, setSpec] = useState<AvatarSpec>(start);
  const [tab, setTab] = useState<Tab>(start.kind === "logo" ? "logos" : start.kind === "person" ? "people" : start.kind === "upload" ? "upload" : "letters");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const dlg = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dlg.current?.querySelector<HTMLElement>("[aria-pressed='true'], [role=tab][aria-selected='true']")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const letter = spec.kind === "letter" ? spec : { kind: "letter" as const, letter: defaultAvatar(name).kind === "letter" ? (defaultAvatar(name) as { letter: string }).letter : "A", color: 4 };
  const value = formatAvatar(spec);

  /** Shrinks the picked image, asks the server for a presigned URL, and sends the bytes straight to R2. */
  async function pick(file: File) {
    setErr(""); setSending(true);
    try {
      const img = await squareImage(file, MAX_BYTES);
      if (!img.ok) return setErr(img.reason);
      const t = await requestUploadAction(target, img.type, img.blob.size);
      if (!t.ok) return setErr(t.error);
      const put = await fetch(t.data.url, { method: "PUT", headers: { "Content-Type": img.type }, body: img.blob });
      if (!put.ok) return setErr("The upload failed. Check your connection and try again.");
      setSpec({ kind: "upload", key: t.data.key });
    } catch {
      setErr("The upload failed. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function save() {
    setBusy(true); setErr("");
    const r = await (onSave ?? setAvatarAction)(value);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    router.refresh();
    onClose();
  }

  return createPortal(
    <div className="av-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dlg} className="av-dlg" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <div className="av-prev"><Avatar value={value} name={name} size={56} />{hint}</div>
        <div className="av-tabs" role="tablist">
          {tabs.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        {tab === "letters" && (<>
          <div className="av-swatches" aria-label="Colour">
            {LETTER_STYLES.map((c, i) => <button key={c.bg} style={{ background: c.bg }} aria-label={`Colour ${i + 1}`} aria-pressed={letter.color === i} onClick={() => setSpec({ ...letter, color: i })} />)}
          </div>
          <div className="av-grid">
            {LETTERS.map((l) => (
              <button key={l} aria-label={`Letter ${l}`} aria-pressed={spec.kind === "letter" && spec.letter === l} onClick={() => setSpec({ ...letter, letter: l })}>
                <Avatar value={`l:${l}:${letter.color}`} name={name} size={40} />
              </button>
            ))}
          </div>
        </>)}
        {tab === "logos" && (
          <div className="av-grid">
            {LOGO_CHOICES.map((id) => (
              <button key={id} aria-label={id.split(":")[1].replace(/-icon$/, "")} aria-pressed={spec.kind === "logo" && spec.id === id} onClick={() => setSpec({ kind: "logo", id })}>
                <span className="av" style={{ background: "#fffef7", width: 40, height: 40 }}><BrandIcon id={id} size={24} /></span>
              </button>
            ))}
          </div>
        )}
        {tab === "people" && (
          <div className="av-grid">
            {PEOPLE.map((_, i) => (
              <button key={i} aria-label={`Person ${i + 1}`} aria-pressed={spec.kind === "person" && spec.index === i} onClick={() => setSpec({ kind: "person", index: i })}>
                <Avatar value={`p:${i}`} name={name} size={40} />
              </button>
            ))}
          </div>
        )}
        {tab === "upload" && (
          <div className="av-up">
            <button type="button" className="btn-sm" disabled={sending} onClick={() => fileRef.current?.click()}>{sending ? "Uploading…" : spec.kind === "upload" ? "Choose another image" : "Choose an image"}</button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void pick(f); }} />
            <p className="note">PNG, JPG, WebP or GIF. It is cropped to a square and shrunk to 256 px on your device before it is sent. Pick Save to keep it.</p>
          </div>
        )}
        <div className="av-foot">
          {err && <span className="av-err" role="alert">{err}</span>}
          <button className="ph-link" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-sm" type="button" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
