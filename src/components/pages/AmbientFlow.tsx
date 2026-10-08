import { BrandIcon } from "@/components/studio/BrandIcon";

/** Faint service icons near the page edges, in percentages of the screen. */
const CHIPS = [
  { id: "logos:aws-s3", x: 5, y: 22, d: 0 }, { id: "logos:postgresql", x: 9, y: 58, d: -2 }, { id: "logos:redis", x: 4, y: 84, d: -4 },
  { id: "logos:cloudflare-icon", x: 94, y: 20, d: -1 }, { id: "logos:kafka-icon", x: 91, y: 55, d: -3 }, { id: "logos:aws-lambda", x: 95, y: 82, d: -5 },
] as const;

/** Curves in a 1600x900 box. Each carries a dot that travels along it, like a request moving through a system. */
const PATHS = [
  { d: "M 80 200 C 220 260, 120 380, 170 500", t: 7 },
  { d: "M 170 520 C 130 620, 90 700, 70 760", t: 9 },
  { d: "M 1520 190 C 1400 250, 1480 360, 1440 480", t: 8 },
  { d: "M 1440 500 C 1500 600, 1540 680, 1520 740", t: 10 },
] as const;

/** A quiet moving backdrop for account pages: drifting colour, dashed links with travelling dots, floating icons. Decorative only. */
export function AmbientFlow() {
  return (
    <div className="amb" aria-hidden>
      <span className="amb-blob a" /><span className="amb-blob b" />
      <svg className="amb-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        {PATHS.map((p, i) => (
          <g key={i}>
            <path d={p.d} className="amb-line" style={{ animationDelay: `${i * -0.5}s` }} />
            <circle r="4.5" className="amb-dot">
              <animateMotion dur={`${p.t}s`} repeatCount="indefinite" path={p.d} begin={`${i * -1.3}s`} />
            </circle>
          </g>
        ))}
      </svg>
      {CHIPS.map((c) => (
        <span key={c.id} className="amb-chip" style={{ left: `${c.x}%`, top: `${c.y}%`, animationDelay: `${c.d}s` }}><BrandIcon id={c.id} size={26} /></span>
      ))}
    </div>
  );
}
