"use client";

import { useEffect, useRef, useState } from "react";

const EASE = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic

const prefersReducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a displayed number toward its target so changes read as movement, not a jump. */
export function useTween(target: number, ms = 480): number {
  const [shown, setShown] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (!Number.isFinite(target) || prefersReducedMotion() || cur.current === target) { cur.current = target; return; }
    const from = Number.isFinite(cur.current) ? cur.current : target;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      cur.current = p === 1 ? target : from + (target - from) * EASE(p);
      setShown(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  // Until the first frame lands, or when motion is off, show the real value rather than a stale one.
  return !Number.isFinite(target) || prefersReducedMotion() ? target : shown;
}

export function Num({ value, format, ms }: { value: number; format: (n: number) => string; ms?: number }) {
  return <span className="num">{format(useTween(value, ms))}</span>;
}
