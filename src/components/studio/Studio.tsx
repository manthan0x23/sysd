"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./Canvas";
import { Panel } from "./panel/Panel";
import { Nav } from "./Nav";
import { Palette } from "./Palette";

export interface StudioUser { name: string; image: string | null }

export function Studio({ user }: { user: StudioUser }) {
  return (
    <ReactFlowProvider>
      <div className="studio">
        <Canvas />
        <Nav user={user} />
        <Palette />
        <Panel />
      </div>
    </ReactFlowProvider>
  );
}
