"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useStudio, type InitialDesign } from "@/store/useStudio";
import { Canvas } from "./Canvas";
import { Nav } from "./Nav";
import { Palette } from "./Palette";
import { Panel } from "./panel/Panel";
import { useAutosave } from "./useAutosave";

export interface StudioUser { name: string; image: string | null }

/**
 * `hydrateKey` identifies which design should be on screen. The canvas waits until the store holds that
 * design, so a saved design never flashes the sample graph first.
 */
export function Studio({ user, initial, hydrateKey, shareToken }: { user: StudioUser; initial: InitialDesign | null; hydrateKey: string; shareToken?: string }) {
  const ready = useStudio((s) => s.design.key === hydrateKey);
  useEffect(() => { useStudio.getState().hydrate(hydrateKey, initial); }, [hydrateKey, initial]);
  const { dirty } = useAutosave();
  const readOnly = useStudio((s) => s.design.shared || s.design.level === "view");

  if (!ready) return <div className="studio" aria-busy="true" />;
  return (
    <ReactFlowProvider>
      <div className={`studio ${readOnly ? "readonly" : ""}`}>
        <Canvas readOnly={readOnly} />
        <Nav user={user} dirty={dirty} shareToken={shareToken} />
        {!readOnly && <Palette />}
        <Panel />
      </div>
    </ReactFlowProvider>
  );
}
