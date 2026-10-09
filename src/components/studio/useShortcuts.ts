"use client";

import { useEffect } from "react";
import { redo, undo, useStudio } from "@/store/useStudio";

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
};

/**
 * Canvas keyboard shortcuts. Ctrl or Cmd: C copy, V paste, D duplicate, A select all, Z undo, Shift+Z or Y redo.
 * Arrow keys nudge the selection one grid step (Shift: four). Escape stops the simulator, then clears the selection.
 * H pans with the mouse, V (or S) draws selection boxes.
 */
export function useShortcuts(readOnly: boolean) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey) return;
      const s = useStudio.getState();
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod) {
        if (k === "a") { e.preventDefault(); s.selectAll(); return; }
        if (readOnly) return;
        if (k === "c") { if (s.copySelection()) e.preventDefault(); return; }
        if (k === "v") { e.preventDefault(); s.paste(); return; }
        if (k === "d") { e.preventDefault(); s.duplicateSelection(); return; }
        if (k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
        if (k === "y") { e.preventDefault(); redo(); return; }
        return;
      }
      if (k === "escape") {
        if (s.req) s.setReq(null);
        else if (s.multi.length || s.selectedId || s.selectedEdgeId) { s.select(null); }
        return;
      }
      if (k === "h") { s.setTool("pan"); return; }
      if (k === "v" || k === "s") { s.setTool("select"); return; }
      if (!readOnly && k.startsWith("arrow") && (s.multi.length || s.selectedId)) {
        e.preventDefault();
        const step = (e.shiftKey ? 4 : 1) * 11;
        s.nudgeSelection(k === "arrowleft" ? -step : k === "arrowright" ? step : 0, k === "arrowup" ? -step : k === "arrowdown" ? step : 0);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [readOnly]);
}
