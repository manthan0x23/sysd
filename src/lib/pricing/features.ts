export type Cell = boolean | string;

/** What each plan includes, grouped by purpose. Rows read left to right: label, Starter, Pro. */
export const FEATURE_GROUPS: { name: string; rows: [string, Cell, Cell][] }[] = [
  { name: "Canvas and learning", rows: [
    ["70+ building blocks and 600+ ways to run them", true, true],
    ["Servers and containers you can nest, with fit meters", true, true],
    ["Traffic sliders and live load on every component", true, true],
    ["Why each component is busy, in plain words", true, true],
    ["Your own names, icons and costs", true, true],
  ] },
  { name: "Cost", rows: [
    ["Cost estimate and sortable breakdown", true, true],
    ["Full-screen breakdown table", true, true],
    ["Real prices with source and date", true, true],
  ] },
  { name: "Save and share", rows: [
    ["Saved designs with autosave", true, true],
    ["Read-only share links with view counts", true, true],
  ] },
  { name: "Exports", rows: [
    ["Excel workbook with formulas and share link", false, true],
    ["CSV, JSON, SVG, PNG and printable report", false, true],
  ] },
  { name: "Teams", rows: [
    ["Join a team you are invited to", true, true],
    ["Create teams with viewer and editor roles", false, true],
  ] },
  { name: "AI agent", rows: [
    ["Designs the system for your app from the users you expect", false, "Coming soon"],
    ["Picks services and plans, and shows where to cut cost", false, "Coming soon"],
    ["Builds it on the canvas for you", false, "Coming soon"],
  ] },
];
