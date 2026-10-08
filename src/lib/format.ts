export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

export function fmtCompact(n: number): string {
  if (n >= 1e6) return `${+(n / 1e6).toPrecision(3)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toPrecision(3)}k`;
  return String(Math.round(n));
}

export const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** $1.2k style for tight spaces; whole dollars below $1,000. */
export function fmtMoney(n: number): string {
  if (n >= 1e6) return `$${+(n / 1e6).toPrecision(3)}M`;
  if (n >= 1e4) return `$${Math.round(n / 1e3)}k`;
  if (n >= 1e3) return `$${+(n / 1e3).toPrecision(3)}k`;
  if (n >= 100) return `$${Math.round(n)}`;
  return `$${n.toFixed(n < 10 && n % 1 ? 2 : 0)}`;
}

/** Cost per user is tiny, so it keeps four decimals under a cent. */
export const fmtUnit = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`);
export const fmtPct = (n: number) => (n * 100 > 200 ? "200%+" : `${Math.round(n * 100)}%`);
