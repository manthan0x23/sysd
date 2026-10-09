import { BrandIcon } from "@/components/studio/BrandIcon";
import { LETTER_STYLES, PEOPLE, defaultAvatar, parseAvatar, type AvatarSpec, type PersonLook } from "@/lib/avatar";

const INK = "#1a1a1a";
/** Public address of an uploaded image. Without the setting the avatar falls back to a letter. */
const uploadUrl = (key: string) => `${(process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`;

function Person({ look }: { look: PersonLook }) {
  const { bg, shirt, skin, hair, style } = look;
  const line = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <rect width="64" height="64" fill={bg} />
      {style === "long" && <path d="M19 31 C17 49 21 55 32 55 C43 55 47 49 45 31Z" fill={hair} {...line} />}
      <path d="M9 68 C9 51 20 47 32 47 C44 47 55 51 55 68Z" fill={shirt} {...line} />
      <path d="M28 40 L28 47 C30 50 34 50 36 47 L36 40Z" fill={skin} {...line} />
      <circle cx="32" cy="30" r="12" fill={skin} {...line} />
      {style === "short" && <path d="M20 29 C19 15 45 15 44 29 C40 23 25 23 20 29Z" fill={hair} {...line} />}
      {style === "long" && <path d="M20 29 C19 15 45 15 44 29 C40 23 25 23 20 29Z" fill={hair} {...line} />}
      {style === "bun" && <><circle cx="32" cy="14" r="6" fill={hair} {...line} /><path d="M20 29 C19 17 45 17 44 29 C40 23 25 23 20 29Z" fill={hair} {...line} /></>}
      {style === "curly" && [[22, 24], [28, 18], [36, 18], [42, 24]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="6.5" fill={hair} {...line} />)}
      {style === "cap" && <><path d="M20 27 C20 13 44 13 44 27Z" fill={hair} {...line} /><path d="M20 27 L50 27" {...line} /></>}
      <circle cx="28" cy="32" r="1.5" fill={INK} /><circle cx="36" cy="32" r="1.5" fill={INK} />
      <path d="M29 36.5 C31 38.5 33 38.5 35 36.5" fill="none" {...line} strokeWidth={1.8} />
    </svg>
  );
}

/**
 * The user's avatar: a letter, a logo or a drawn person (see lib/avatar.ts). Draws inline SVG/text, so there is
 * no image request and nothing from the sign-in provider is shown. `value` is the stored string, `name` the fallback.
 */
export function Avatar({ value, name, size = 28, className = "" }: { value?: string | null; name: string; size?: number; className?: string }) {
  const parsed = parseAvatar(value);
  const a: AvatarSpec = parsed && !(parsed.kind === "upload" && !process.env.NEXT_PUBLIC_R2_PUBLIC_URL) ? parsed : defaultAvatar(name);
  const st = a.kind === "letter" ? LETTER_STYLES[a.color] : null;
  const bg = st ? st.bg : a.kind === "logo" ? "#fffef7" : a.kind === "upload" ? "var(--surface)" : undefined;
  return (
    <span className={`av ${className}`} style={{ width: size, height: size, background: bg, color: st?.fg, fontSize: Math.round(size * 0.46) }} aria-hidden>
      {a.kind === "letter" && a.letter}
      {a.kind === "logo" && <BrandIcon id={a.id} size={Math.round(size * 0.62)} />}
      {a.kind === "person" && <Person look={PEOPLE[a.index]} />}
      {/* eslint-disable-next-line @next/next/no-img-element -- a small user image from our own bucket, already resized */}
      {a.kind === "upload" && <img src={uploadUrl(a.key)} alt="" width={size} height={size} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
    </span>
  );
}
