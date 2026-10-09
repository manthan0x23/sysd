"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AvatarPicker } from "./AvatarPicker";

/** The avatar in the account header; click to change it. */
export function AccountAvatar({ value, name }: { value: string | null; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ph-avatar" onClick={() => setOpen(true)} title="Change your avatar" aria-label="Change your avatar" style={{ all: "unset", cursor: "pointer", borderRadius: "50%", display: "grid" }}>
        <Avatar value={value} name={name} size={28} />
      </button>
      {open && <AvatarPicker current={value} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}
