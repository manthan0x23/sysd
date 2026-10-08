"use client";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  log?: boolean;
  format: (n: number) => string;
  onChange: (n: number) => void;
}

const STEPS = 1000;

/** Logarithmic by default: traffic spans orders of magnitude, so a linear slider is useless at the low end. */
export function LogSlider({ label, value, min, max, log = true, format, onChange }: Props) {
  const toPos = (v: number) =>
    log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min);
  const fromPos = (t: number) => (log ? Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min))) : min + t * (max - min));
  const sig = (n: number) => (n >= 100 ? Number(n.toPrecision(2)) : Math.round(n));
  return (
    <label className="sl">
      <span>{label}<b>{format(value)}</b></span>
      <input
        type="range" min={0} max={STEPS} step={1}
        value={Math.round(toPos(value) * STEPS)}
        onChange={(e) => onChange(log ? sig(fromPos(+e.target.value / STEPS)) : Math.round(fromPos(+e.target.value / STEPS)))}
      />
    </label>
  );
}
