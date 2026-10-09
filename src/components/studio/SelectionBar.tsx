"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalSpaceBetween,
  AlignStartHorizontal, AlignStartVertical, AlignVerticalSpaceBetween, Copy, CopyPlus, Trash2,
} from "lucide-react";
import type { AlignMode, DistributeAxis } from "@/lib/selection";
import { useStudio } from "@/store/useStudio";

const ALIGN: { mode: AlignMode; label: string; Icon: typeof AlignStartVertical }[] = [
  { mode: "left", label: "Align left edges", Icon: AlignStartVertical },
  { mode: "center", label: "Align centres (vertical line)", Icon: AlignCenterVertical },
  { mode: "right", label: "Align right edges", Icon: AlignEndVertical },
  { mode: "top", label: "Align top edges", Icon: AlignStartHorizontal },
  { mode: "middle", label: "Align middles (horizontal line)", Icon: AlignCenterHorizontal },
  { mode: "bottom", label: "Align bottom edges", Icon: AlignEndHorizontal },
];
const SPREAD: { axis: DistributeAxis; label: string; Icon: typeof AlignStartVertical }[] = [
  { axis: "horizontal", label: "Space evenly, left to right", Icon: AlignHorizontalSpaceBetween },
  { axis: "vertical", label: "Space evenly, top to bottom", Icon: AlignVerticalSpaceBetween },
];

/** Floats above a group of selected nodes: copy, duplicate, line them up, space them out, delete. */
export function SelectionBar({ ids }: { ids: string[] }) {
  const s = useStudio.getState();
  return (
    <NodeToolbar nodeId={ids} isVisible position={Position.Top} offset={12}>
      <div className="selbar" role="toolbar" aria-label={`${ids.length} selected`}>
        <span className="selcount">{ids.length} selected</span>
        <i className="sep" aria-hidden />
        <button className="ntb" title="Duplicate (Ctrl+D)" aria-label="Duplicate the selection" onClick={() => s.duplicateSelection()}><CopyPlus className="ic" size={15} aria-hidden /></button>
        <button className="ntb" title="Copy (Ctrl+C), then paste with Ctrl+V" aria-label="Copy the selection" onClick={() => s.copySelection()}><Copy className="ic" size={15} aria-hidden /></button>
        <i className="sep" aria-hidden />
        {ALIGN.map(({ mode, label, Icon }) => (
          <button key={mode} className="ntb" title={label} aria-label={label} onClick={() => s.alignSelection(mode)}><Icon className="ic" size={15} aria-hidden /></button>
        ))}
        {ids.length > 2 && <i className="sep" aria-hidden />}
        {ids.length > 2 && SPREAD.map(({ axis, label, Icon }) => (
          <button key={axis} className="ntb" title={label} aria-label={label} onClick={() => s.distributeSelection(axis)}><Icon className="ic" size={15} aria-hidden /></button>
        ))}
        <i className="sep" aria-hidden />
        <button className="ntb" title="Delete (Backspace)" aria-label="Delete the selection" onClick={() => s.removeSelection()}><Trash2 className="ic" size={15} aria-hidden /></button>
      </div>
    </NodeToolbar>
  );
}
