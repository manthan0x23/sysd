"use client";

import { Trash2 } from "lucide-react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";
import { fmtCompact } from "@/lib/format";
import { roundedPath, type Pt } from "@/lib/route";
import { useReadOnly, useStudio } from "@/store/useStudio";
import { Num } from "./Num";

/** role: what the link means (query, enqueue, origin fetch...). invalid: why the rules no longer accept it. */
export type FlowEdgeData = { load?: number; show?: boolean; weight?: number; role?: string; invalid?: string; /** hl: touches the selection. dim: something else is selected. busy: carries a real share of the traffic. */ focus?: "hl" | "dim"; busy?: boolean; /** Corner points from src/lib/route.ts, handle to handle. Ignored when the nodes moved since. */ route?: Pt[] };

/**
 * The planned route, snapped onto the handles React Flow actually drew (they sit a few pixels outside the node edge).
 * Null when an end is further off than that, which means a node was moved since the route was planned.
 */
function plannedPath(route: Pt[], sx: number, sy: number, tx: number, ty: number) {
  if (route.length < 2) return null;
  const a = route[0], b = route[route.length - 1];
  if (Math.abs(a[0] - sx) > 8 || Math.abs(a[1] - sy) > 3 || Math.abs(b[0] - tx) > 8 || Math.abs(b[1] - ty) > 3) return null;
  const pts = route.map((p) => [...p] as Pt);
  pts[0] = [sx, sy];
  if (pts.length > 2 && route[1][1] === route[0][1]) pts[1] = [pts[1][0], sy];
  const n = pts.length;
  pts[n - 1] = [tx, ty];
  if (n > 2 && route[n - 2][1] === route[n - 1][1]) pts[n - 2] = [pts[n - 2][0], ty];
  return roundedPath(pts);
}

/** Right-angle connector with rounded corners; the label shows the requests per second it carries. */
export function FlowEdge(props: EdgeProps<Edge<FlowEdgeData, "flow">>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected, data } = props;
  const [stepPath, stepX, stepY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12, offset: 24,
  });
  // The planned route is only used while both ends still sit where it was planned for (a node being dragged does not).
  const planned = data?.route ? plannedPath(data.route, sourceX, sourceY, targetX, targetY) : null;
  const path = planned ? planned.d : stepPath;
  const labelX = planned ? planned.label[0] : stepX, labelY = planned ? planned.label[1] : stepY;
  const ro = useReadOnly();
  // While the request simulator runs, links show where the request has been (walked), is now (tracing), and has not reached.
  const rf = useStudio((st) => st.reqFocus);
  const trace = rf ? (rf.edgeId === id ? "tracing" : rf.walked.includes(id) ? "walked" : "unseen") : "";
  const flowing = Boolean(data?.show && data.load && data.load > 0);
  // Labels only where they say something: busy links, or whatever is selected. The rest stay quiet.
  const labelled = flowing && (Boolean(data?.busy) || data?.focus === "hl" || selected);
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={18} className={`${selected ? "selected" : ""} ${flowing && !rf ? "flowing" : ""} ${rf ? "" : data?.focus ?? ""} ${data?.invalid ? "invalid" : ""} ${trace}`} />
      {rf && trace === "tracing" && (
        <circle key={rf.key} r={6} className="req-dot">
          <animateMotion dur={`${Math.max(0.25, rf.ms / 1000)}s`} fill="freeze" calcMode="linear" path={path} {...(rf.reverse ? { keyPoints: "1;0", keyTimes: "0;1" } : {})} />
        </circle>
      )}
      {!rf && (flowing || selected || data?.invalid) && (
        <EdgeLabelRenderer>
          {labelled && (
            <span className={`pill ${selected ? "on" : ""}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
              <Num value={data!.load!} format={fmtCompact} />/s{data?.weight != null ? ` · ${data.weight}%` : ""}{selected && data?.role ? ` · ${data.role}` : ""}
            </span>
          )}
          {data?.invalid && (
            <span className="pill warn" title={data.invalid} style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - (flowing ? 28 : 0)}px)` }}>Not a valid link</span>
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
