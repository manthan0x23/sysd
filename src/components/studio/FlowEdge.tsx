"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";
import { fmtCompact } from "@/lib/format";
import { Num } from "./Num";

export type FlowEdgeData = { load?: number; show?: boolean; weight?: number };

/** Right-angle connector with rounded corners; the label shows the requests per second it carries. */
export function FlowEdge(props: EdgeProps<Edge<FlowEdgeData, "flow">>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected, data } = props;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12, offset: 24,
  });
  const flowing = Boolean(data?.show && data.load && data.load > 0);
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={18} className={`${selected ? "selected" : ""} ${flowing ? "flowing" : ""}`} />
      {flowing && (
        <EdgeLabelRenderer>
          <span className={`pill ${selected ? "on" : ""}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            <Num value={data!.load!} format={fmtCompact} />/s{data?.weight != null ? ` · ${data.weight}%` : ""}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
