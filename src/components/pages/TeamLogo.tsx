"use client";

import { useState } from "react";
import { setTeamLogoAction } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";
import { AvatarPicker } from "./AvatarPicker";

/** A team's logo; the owner can click it to change it (letter, logo, character or an uploaded image). */
export function TeamLogo({ teamId, name, logo, canEdit, size = 44 }: { teamId: string; name: string; logo: string | null; canEdit: boolean; size?: number }) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return <Avatar value={logo} name={name} size={size} />;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Change the team logo" aria-label="Change the team logo" style={{ all: "unset", cursor: "pointer", borderRadius: "50%", display: "grid" }}>
        <Avatar value={logo} name={name} size={size} />
      </button>
      {open && (
        <AvatarPicker
          current={logo} name={name} onClose={() => setOpen(false)} title="Team logo" hint="Shown next to the team's name for everyone in it."
          target={{ scope: "team", teamId }} onSave={(v) => setTeamLogoAction(teamId, v)}
        />
      )}
    </>
  );
}
