import { BRAND_ICONS } from "@/lib/catalog/brandIcons.generated";

/**
 * An avatar is a short string, never an image, so nothing is uploaded or fetched from the sign-in provider:
 *   l:<A-Z or 0-9>:<colour 0-7>   a letter on a colour
 *   b:<brand icon id>             a service or company logo from the bundled set
 *   p:<0-11>                      a drawn person
 *   u:<object key>                an image the person uploaded to our R2 bucket (see src/server/uploads.ts)
 * null means "not chosen": the first letter of the name, with a colour picked from the name.
 */
/** Pastel fills from the app's own palette (lilac is the accent), always with the ink text and outline. The last one is ink on cream. */
export const LETTER_STYLES = [
  { bg: "#f0d7ff", fg: "#1a1a1a" }, // lilac
  { bg: "#fbf0a8", fg: "#1a1a1a" }, // butter
  { bg: "#cdeed8", fg: "#1a1a1a" }, // mint
  { bg: "#cfe3fb", fg: "#1a1a1a" }, // sky
  { bg: "#ffd9c2", fg: "#1a1a1a" }, // peach
  { bg: "#ffd3e0", fg: "#1a1a1a" }, // rose
  { bg: "#e8e2cc", fg: "#1a1a1a" }, // sand
  { bg: "#1a1a1a", fg: "#fffeeb" }, // ink
] as const;
export const LETTER_COLORS = LETTER_STYLES.map((c) => c.bg);
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

/** Logos offered in the picker (all are in the bundled icon set; see scripts/build-brand-icons.mjs). */
export const LOGO_CHOICES = [
  "logos:github-icon", "logos:gitlab", "logos:docker-icon", "logos:kubernetes", "logos:vercel-icon", "logos:netlify", "logos:cloudflare-icon", "logos:supabase-icon",
  "logos:postgresql", "logos:mysql", "logos:mongodb-icon", "logos:redis", "logos:kafka-icon", "logos:nginx", "logos:nodejs-icon", "logos:python",
  "logos:go", "logos:rust", "logos:java", "logos:php", "logos:rails", "logos:bun", "logos:deno", "logos:dotnet",
  "logos:aws", "logos:google-cloud", "logos:microsoft-azure", "logos:firebase", "logos:stripe", "logos:openai-icon", "logos:anthropic-icon", "logos:grafana",
] as const;

export interface PersonLook { bg: string; shirt: string; skin: string; hair: string; style: "short" | "long" | "bun" | "curly" | "cap" | "bald" }
/** Flat characters drawn with the same ink outline as the rest of the UI. Fills stay in the pastel palette. */
export const PEOPLE: PersonLook[] = [
  { bg: "#f0d7ff", shirt: "#fbf0a8", skin: "#f6d7bd", hair: "#1a1a1a", style: "short" },
  { bg: "#fbf0a8", shirt: "#f0d7ff", skin: "#a8714d", hair: "#1a1a1a", style: "long" },
  { bg: "#cdeed8", shirt: "#ffd9c2", skin: "#e8b58f", hair: "#6b4630", style: "bun" },
  { bg: "#ffd9c2", shirt: "#cfe3fb", skin: "#7a4b30", hair: "#1a1a1a", style: "curly" },
  { bg: "#cfe3fb", shirt: "#ffd3e0", skin: "#f6d7bd", hair: "#c98a3a", style: "long" },
  { bg: "#ffd3e0", shirt: "#cdeed8", skin: "#d49a72", hair: "#1a1a1a", style: "short" },
  { bg: "#e8e2cc", shirt: "#f0d7ff", skin: "#e8b58f", hair: "#8b6fd1", style: "cap" },
  { bg: "#f0d7ff", shirt: "#cdeed8", skin: "#8a5a3c", hair: "#1a1a1a", style: "bald" },
  { bg: "#cdeed8", shirt: "#fbf0a8", skin: "#f6d7bd", hair: "#6b4630", style: "curly" },
  { bg: "#fbf0a8", shirt: "#cfe3fb", skin: "#c68863", hair: "#1a1a1a", style: "bun" },
  { bg: "#cfe3fb", shirt: "#ffd9c2", skin: "#a8714d", hair: "#1a1a1a", style: "cap" },
  { bg: "#ffd9c2", shirt: "#f0d7ff", skin: "#e8b58f", hair: "#e8e2cc", style: "short" },
];

export type AvatarSpec =
  | { kind: "letter"; letter: string; color: number }
  | { kind: "logo"; id: string }
  | { kind: "person"; index: number }
  | { kind: "upload"; key: string };

/** Keys the upload code creates: avatars/<user id>/<id>.<ext> or teams/<team id>/<id>.<ext>. Nothing else is accepted. */
export const UPLOAD_KEY = /^(avatars|teams)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{32}\.(png|jpg|webp)$/;

/** Parses and validates a stored or submitted avatar string. Returns null for anything that is not valid. */
export function parseAvatar(s: string | null | undefined): AvatarSpec | null {
  if (!s || s.length > 120) return null;
  const [k, a, b] = s.split(":");
  if (k === "l" && a?.length === 1 && LETTERS.includes(a) && /^[0-7]$/.test(b ?? "")) return { kind: "letter", letter: a, color: Number(b) };
  if (k === "p" && /^\d+$/.test(a ?? "") && Number(a) < PEOPLE.length) return { kind: "person", index: Number(a) };
  if (k === "u") { const key = s.slice(2); if (UPLOAD_KEY.test(key)) return { kind: "upload", key }; return null; }
  if (k === "b") {
    const id = s.slice(2);
    if ((LOGO_CHOICES as readonly string[]).includes(id) && BRAND_ICONS[id]) return { kind: "logo", id };
  }
  return null;
}

export const formatAvatar = (a: AvatarSpec) => a.kind === "letter" ? `l:${a.letter}:${a.color}` : a.kind === "logo" ? `b:${a.id}` : a.kind === "upload" ? `u:${a.key}` : `p:${a.index}`;

/** What shows when nothing was chosen: the name's first letter on a colour derived from the name. */
export function defaultAvatar(name: string): AvatarSpec {
  const ch = name.trim().slice(0, 1).toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { kind: "letter", letter: LETTERS.includes(ch) ? ch : "?", color: h % LETTER_COLORS.length };
}
