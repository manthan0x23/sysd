"use client";

import { Handle, NodeToolbar, Position, type NodeProps } from "@xyflow/react";
import { TYPE_BY_ID, offeringLabel } from "@/lib/catalog";
import { fmtPct } from "@/lib/format";
import { offeringOf, type StudioNode } from "@/lib/model";
import { CopyPlus, Trash2 } from "lucide-react";
import { useReadOnly, useStudio } from "@/store/useStudio";
import { Num } from "./Num";
import { NodeTitle } from "./NodeTitle";
import { ServiceIcon } from "./ServiceIcon";

export function NodeCard({ id, data, selected }: NodeProps<StudioNode>) {
  const ro = useReadOnly();
  const alone = useStudio((s) => s.multi.length === 0);
  const tracing = useStudio((s) => Boolean(s.reqFocus?.nodes.includes(id)));
  const type = TYPE_BY_ID[data.typeId];
  const offering = offeringOf(data);
  const u = data.util;
  const copies = data.instances ?? 1;
  const hot = u != null && u >= 0.8;
  const provider = offering ? (offering.provider === "Self-hosted" ? offering.product : offering.provider) : type.id === "client" ? "Web, mobile" : "";
  const sub = data.name ? `${type.short ?? type.label} · ${provider}` : provider;
  const cls = ["node", selected ? "sel" : "", tracing ? "tracing" : "", hot && data.showMetrics ? "hot" : "", u != null && u > 1 && data.showMetrics ? "over" : ""].join(" ");
  return (
    <div className={cls} title={`${offering ? offeringLabel(offering) : type.label}${type.cap && data.showMetrics ? `\n${Math.round(data.load ?? 0)} of ${type.cap} requests/s (illustrative capacity: 100% = ${type.cap}/s)` : ""}`}>
      {selected && !ro && alone && (
        <NodeToolbar position={Position.Top} offset={8}>
          <button className="ntb" onClick={() => useStudio.getState().duplicateSelection()} title="Duplicate (Ctrl+D)" aria-label={`Duplicate ${data.name || "this service"}`}><CopyPlus className="ic" size={15} aria-hidden /></button>
          <button className="ntb" onClick={() => useStudio.getState().removeNodes([id])} title="Delete (Backspace)" aria-label={`Delete ${data.name || "this service"}`}><Trash2 className="ic" size={15} aria-hidden /></button>
        </NodeToolbar>
      )}
      {type.role !== "source" && <Handle type="target" position={Position.Left} />}
      <ServiceIcon typeId={data.typeId} offering={offering} custom={data.icon} />
      <div className="nm"><NodeTitle id={id} name={data.name} fallback={type.short ?? type.label} /><small>{sub}</small></div>
      {copies > 1 && <span className="copies" title={data.autoscale ? `Autoscaling ${data.autoscale.min} to ${data.autoscale.max}: ${copies} copies at this load` : `${copies} copies`}>{data.autoscale ? `${copies}×` : `×${copies}`}</span>}
      {(data.backlog ?? 0) > 0 && data.showMetrics && <span className="backlog" title="Messages arrive faster than this can drain them">backlog +{Math.round(data.backlog!)}/s</span>}
      {data.showMetrics && u != null && (
        <div className="ut">
          <div className="bar"><i style={{ width: `${Math.min(u * 100, 100)}%` }} /></div>
          <b><Num value={u} format={fmtPct} /></b>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
