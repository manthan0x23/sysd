import { BRAND_ICONS } from "@/lib/catalog/brandIcons.generated";

/** A bundled brand or service logo. Renders nothing for an unknown id so callers can fall back. */
export function BrandIcon({ id, size = 16 }: { id?: string; size?: number }) {
  const ic = id ? BRAND_ICONS[id] : undefined;
  if (!ic) return null;
  return (
    <svg className="ic brand" width={size} height={size} viewBox={`0 0 ${ic.w} ${ic.h}`} fill={ic.mono ? "currentColor" : undefined} aria-hidden dangerouslySetInnerHTML={{ __html: ic.body }} />
  );
}
