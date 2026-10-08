"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import {
  acceptInviteAction, cancelInviteAction, createTeamAction, deleteTeamAction, inviteAction, removeMemberAction, setRoleAction,
} from "@/app/actions/teams";

type Role = "viewer" | "editor";

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createTeamAction(name); if (r.ok) router.push(`/teams/${r.data.id}`); else setError(r.error); }); }}>
      <input className="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Team name, e.g. Platform" aria-label="Team name" required />
      <button className="btn-sm" disabled={pending || !name.trim()}>Create team</button>
      {error && <span className="note err" role="alert">{error}</span>}
    </form>
  );
}

interface Member { userId: string; name: string | null; role: Role }
interface Invite { id: string; role: Role; expiresAt: string }

export function TeamManager({ teamId, isOwner, me, members, invites }: { teamId: string; isOwner: boolean; me: string; members: Member[]; invites: Invite[] }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>("editor");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => start(async () => {
    const r = await fn();
    if (r.ok) { setError(null); after?.(); router.refresh(); } else setError(r.error ?? "Something went wrong.");
  });

  return (
    <div className="tm">
      {error && <p className="note err" role="alert">{error}</p>}
      <h2>Members</h2>
      <ul className="list">
        {members.map((m) => (
          <li key={m.userId}>
            <span className="list-main"><b>{m.name ?? "Unnamed"}{m.userId === me ? " (you)" : ""}</b><small>{m.role}</small></span>
            <span className="acts">
              {isOwner && (
                <select value={m.role} disabled={pending} aria-label={`Role for ${m.name ?? "member"}`} onChange={(e) => act(() => setRoleAction(teamId, m.userId, e.target.value as Role))}>
                  <option value="viewer">Viewer</option><option value="editor">Editor</option>
                </select>
              )}
              {(isOwner || m.userId === me) && <button className="pill-btn" disabled={pending} onClick={() => act(() => removeMemberAction(teamId, m.userId), m.userId === me ? () => router.push("/teams") : undefined)}>{m.userId === me ? "Leave" : "Remove"}</button>}
            </span>
          </li>
        ))}
        {!members.length && <li className="empty-note">Only the owner so far.</li>}
      </ul>

      {isOwner && (
        <>
          <h2>Invite someone</h2>
          <p className="note">Create a link and send it yourself. It works once, expires in 7 days, and the person has to sign in with GitHub or Google to use it.</p>
          <div className="inline-form">
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Role for the invite">
              <option value="editor">Editor: can change designs</option><option value="viewer">Viewer: can only look</option>
            </select>
            <button className="btn-sm" disabled={pending} onClick={() => act(async () => { const r = await inviteAction(teamId, role); if (r.ok) { setLink(`${location.origin}/invite/${r.data.token}`); setCopied(false); return { ok: true }; } return r; })}>Create invite link</button>
          </div>
          {link && (
            <div className="invite-link">
              <code>{link}</code>
              <button className="pill-btn" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); }}>{copied ? <><Check className="ic" size={12} aria-hidden /> Copied</> : <><Copy className="ic" size={12} aria-hidden /> Copy</>}</button>
              <small>Shown once. If you lose it, cancel it and make a new one.</small>
            </div>
          )}
          {invites.length > 0 && (
            <>
              <h3>Waiting to be used</h3>
              <ul className="list">
                {invites.map((i) => (
                  <li key={i.id}><span className="list-main"><b>{i.role === "editor" ? "Editor" : "Viewer"} invite</b><small>expires {new Date(i.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></span>
                    <button className="pill-btn" disabled={pending} onClick={() => act(() => cancelInviteAction(teamId, i.id))}>Cancel</button></li>
                ))}
              </ul>
            </>
          )}
          <h2>Danger zone</h2>
          {!confirmDelete
            ? <button className="pill-btn" onClick={() => setConfirmDelete(true)}>Delete this team</button>
            : <span className="acts"><span className="note">This deletes the team and every design saved in it.</span>
              <button className="pill-btn danger" disabled={pending} onClick={() => act(() => deleteTeamAction(teamId), () => router.push("/teams"))}>Delete for good</button>
              <button className="pill-btn" onClick={() => setConfirmDelete(false)}>Keep</button></span>}
        </>
      )}
    </div>
  );
}

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn-lg" disabled={pending} onClick={() => start(async () => { const r = await acceptInviteAction(token); if (r.ok) router.push(`/teams/${r.data.teamId}`); else setError(r.error); })}>Join the team</button>
      {error && <p className="note err" role="alert">{error}</p>}
    </>
  );
}
