"use client";

import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { TYPE_BY_ID, offeringLabel } from "@/lib/catalog";
import { needOf, offeringOf, type StudioNode } from "@/lib/model";
import { Num } from "./Num";
import { NodeTitle } from "./NodeTitle";
import { ServiceIcon } from "./ServiceIcon";

function Meter({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const r = total > 0 ? used / total : 0;
  const fmt = (n: number) => `${n >= 100 ? Math.round(n) : +n.toFixed(1)}`;
  return (
    <div className={`meter ${r > 1 ? "over" : r > 0.8 ? "tight" : ""}`}>
      <div className="mt"><span>{label}</span><b><Num value={used} format={fmt} />/{fmt(total)}{unit}</b></div>
      <div className="bar"><i style={{ width: `${Math.min(r * 100, 100)}%` }} /></div>
    </div>
  );
}

const VERDICT = { fits: "Fits", tight: "Tight", over: "Does not fit", open: "" } as const;

/** A group block that holds other nodes: a server/VPS, or a Docker container inside one. */
export function HostNode({ id, data, selected }: NodeProps<StudioNode>) {
  const type = TYPE_BY_ID[data.typeId];
  const fit = data.fit;
  const offering = offeringOf(data);
  const have = fit?.have;
  const server = type.host === "server";
  return (
    <div className={`host ${type.host} ${selected ? "sel" : ""} ${fit?.verdict ?? ""}`}>
      <NodeResizer isVisible={selected} minWidth={server ? 360 : 220} minHeight={server ? 220 : 130} lineStyle={{ borderColor: "var(--ring)" }} handleStyle={{ background: "var(--surface)", border: "1.5px solid var(--ring)", width: 9, height: 9, borderRadius: 3 }} />
      <Handle type="target" position={Position.Left} />
      <header>
        <ServiceIcon typeId={data.typeId} offering={offering} custom={data.icon} size={16} />
        <div className="nm">
          <NodeTitle id={id} name={data.name} fallback={type.label} />
          <small>{server ? `${offeringLabel(offering)} · ${fit?.plan?.label ?? "no plan"}${fit?.auto ? " (auto)" : ""}` : "Runs inside a server"}</small>
        </div>
        {fit && fit.verdict !== "open" && <span key={fit.verdict} className={`chip ${fit.verdict}`}>{VERDICT[fit.verdict]}</span>}
      </header>
      {fit && have && (
        <div className="meters">
          <Meter label="CPU" used={fit.need.cpu} total={have.cpu} unit="" />
          <Meter label="RAM" used={fit.need.ramGb} total={have.ramGb} unit=" GB" />
          <Meter label="Disk" used={fit.need.diskGb} total={have.diskGb} unit=" GB" />
        </div>
      )}
      {fit && !have && fit.children > 0 && <p className="hostneed">Needs {needOf(fit.need)}</p>}
      {fit && fit.children === 0 && <p className="hostempty">Drop services here</p>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
