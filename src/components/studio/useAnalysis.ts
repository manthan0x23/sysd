"use client";

import { useMemo } from "react";
import { analyze } from "@/lib/analysis";
import { explain } from "@/lib/sim";
import { useStudio } from "@/store/useStudio";

/** One shared, memoised analysis of the current design: loads, fits, real-price estimates and costs. */
export function useAnalysis() {
  const nodes = useStudio((s) => s.nodes);
  const edges = useStudio((s) => s.edges);
  const workload = useStudio((s) => s.workload);
  return useMemo(() => {
    const a = analyze(nodes, edges, workload);
    return { ...a, nodes, edges, workload, why: explain(nodes, edges, workload, a.sim) };
  }, [nodes, edges, workload]);
}
