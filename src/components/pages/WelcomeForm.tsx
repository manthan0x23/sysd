"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfileAction } from "@/app/actions/profile";
import { CLOUDS, LEVELS, PURPOSES, ROLES, type Profile } from "@/lib/profile";

function Choice<T extends string>({ legend, items, value, onPick }: { legend: string; items: readonly T[]; value?: T; onPick: (v: T | undefined) => void }) {
  return (
    <fieldset className="wf-set">
      <legend>{legend}</legend>
      <div className="wf-chips">
        {items.map((i) => <button key={i} type="button" className={`wf-chip ${value === i ? "on" : ""}`} aria-pressed={value === i} onClick={() => onPick(value === i ? undefined : i)}>{i}</button>)}
      </div>
    </fieldset>
  );
}

export function WelcomeForm() {
  const router = useRouter();
  const [p, setP] = useState<Profile>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (skip: boolean) => {
    setBusy(true); setError(null);
    const r = await saveProfileAction(skip ? {} : p);
    if (r.ok) router.replace("/home"); else { setError(r.error); setBusy(false); }
  };

  return (
    <form className="wf" onSubmit={(e) => { e.preventDefault(); void submit(false); }}>
      <Choice legend="What best describes you?" items={ROLES} value={p.role} onPick={(role) => setP((s) => ({ ...s, role }))} />
      <Choice legend="What brings you here?" items={PURPOSES} value={p.purpose} onPick={(purpose) => setP((s) => ({ ...s, purpose }))} />
      <Choice legend="Your system design level" items={LEVELS} value={p.level} onPick={(level) => setP((s) => ({ ...s, level }))} />
      <fieldset className="wf-set">
        <legend>Clouds and hosts you use or are weighing</legend>
        <div className="wf-chips">
          {CLOUDS.map((c) => {
            const on = p.clouds?.includes(c) ?? false;
            return <button key={c} type="button" className={`wf-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setP((s) => ({ ...s, clouds: on ? s.clouds?.filter((x) => x !== c) : [...(s.clouds ?? []), c] }))}>{c}</button>;
          })}
        </div>
      </fieldset>
      <label className="wf-set">
        <span className="wf-legend">Company or school <small>(optional)</small></span>
        <input className="wf-input" maxLength={60} value={p.company ?? ""} onChange={(e) => setP((s) => ({ ...s, company: e.target.value }))} autoComplete="organization" />
      </label>
      {error && <p className="note err" role="alert">{error}</p>}
      <div className="wf-actions">
        <button className="btn-sm" type="submit" disabled={busy}>Continue</button>
        <button className="wf-skip" type="button" disabled={busy} onClick={() => void submit(true)}>Skip for now</button>
      </div>
    </form>
  );
}
