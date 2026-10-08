"use client";

import { Trash2 } from "lucide-react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";
import { fmtCompact } from "@/lib/format";
import { useReadOnly, useStudio } from "@/store/useStudio";
import { Num } from "./Num";

export type FlowEdgeData = { load?: number; show?: boolean; weight?: number };

/** Right-angle connector with rounded corners; the label shows the requests per second it carries. */
export function FlowEdge(props: EdgeProps<Edge<FlowEdgeData, "flow">>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected, data } = props;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12, offset: 24,
  });
  const ro = useReadOnly();
  const flowing = Boolean(data?.show && data.load && data.load > 0);
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={18} className={`${selected ? "selected" : ""} ${flowing ? "flowing" : ""}`} />
      {(flowing || (selected && !ro)) && (
        <EdgeLabelRenderer>
          {flowing && (
            <span className={`pill ${selected ? "on" : ""}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
              <Num value={data!.load!} format={fmtCompact} />/s{data?.weight != null ? ` · ${data.weight}%` : ""}
            </span>
          )}
          {selected && !ro && (
            <button
              className="ntb nodrag nopan" style={{ position: "absolute", pointerEvents: "all", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + (flowing ? 28 : 0)}px)` }}
              onClick={() => useStudio.getState().removeEdges([id])} title="Remove this link (Backspace)" aria-label="Remove this link"
            ><Trash2 className="ic" size={15} aria-hidden /></button>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}
