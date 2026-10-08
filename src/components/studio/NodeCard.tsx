"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { TYPE_BY_ID, offeringLabel } from "@/lib/catalog";
import { fmtPct } from "@/lib/format";
import { offeringOf, type StudioNode } from "@/lib/model";
import { Num } from "./Num";
import { NodeTitle } from "./NodeTitle";
import { ServiceIcon } from "./ServiceIcon";

export function NodeCard({ id, data, selected }: NodeProps<StudioNode>) {
  const type = TYPE_BY_ID[data.typeId];
  const offering = offeringOf(data);
  const u = data.util;
  const hot = u != null && u >= 0.8;
  const provider = offering ? (offering.provider === "Self-hosted" ? offering.product : offering.provider) : type.id === "client" ? "Web, mobile" : "";
  const sub = data.name ? `${type.short ?? type.label} · ${provider}` : provider;
  const cls = ["node", selected ? "sel" : "", hot && data.showMetrics ? "hot" : "", u != null && u > 1 && data.showMetrics ? "over" : ""].join(" ");
  return (
    <div className={cls} title={`${offering ? offeringLabel(offering) : type.label}${type.cap && data.showMetrics ? `\n${Math.round(data.load ?? 0)} of ${type.cap} requests/s (illustrative capacity: 100% = ${type.cap}/s)` : ""}`}>
      {type.role !== "source" && <Handle type="target" position={Position.Left} />}
      <ServiceIcon typeId={data.typeId} offering={offering} custom={data.icon} />
      <div className="nm"><NodeTitle id={id} name={data.name} fallback={type.short ?? type.label} /><small>{sub}</small></div>
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
